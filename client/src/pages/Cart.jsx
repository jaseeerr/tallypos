"use client"

import { useEffect, useState, useMemo } from "react"
import { Trash2, Package, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"
import MyAxiosInstance from "../utils/axios"
import { API_BASE } from "../utils/url"

export default function CartPage() {
  const axiosInstance = MyAxiosInstance()

  const [cartItems, setCartItems] = useState([])
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [loading, setLoading] = useState(true)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    loadCart()
  }, [])

  async function loadCart() {
    setLoading(true)

    const storedIds = JSON.parse(localStorage.getItem("cartItems") || "[]")

    if (storedIds.length === 0) {
      setCartItems([])
      setLoading(false)
      return
    }

    try {
      const res = await axiosInstance.post("/inventoryBulk", {
        ids: storedIds,
      })
      setCartItems(res.data.items || [])
    } catch (err) {
      console.error("Failed to load cart", err)
    } finally {
      setLoading(false)
    }
  }

  function removeFromCart(id) {
    const updatedIds = JSON.parse(localStorage.getItem("cartItems") || "[]").filter((pid) => pid !== id)

    localStorage.setItem("cartItems", JSON.stringify(updatedIds))
    setCartItems((prev) => prev.filter((item) => item._id !== id))
  }

  function getPrimaryImage(item) {
    if (Array.isArray(item.imageUrl) && item.imageUrl.length > 0) {
      return item.imageUrl[0]
    }
    return item.imageUrl || null
  }

  function openImageModal(item) {
    setSelectedItem(item)
    setCurrentImageIndex(0)
    setImageModalOpen(true)
  }

  /* ----------------------------------
     Derived Data
  ---------------------------------- */

  const companies = useMemo(() => {
    const unique = new Set(cartItems.map((i) => i.companyName))
    return ["ALL", ...Array.from(unique)]
  }, [cartItems])

  const filteredItems = activeCompany === "ALL" ? cartItems : cartItems.filter((i) => i.companyName === activeCompany)

  const totalAmount = filteredItems.reduce((sum, item) => sum + Number(item.SALESPRICE || 0), 0)

  /* ----------------------------------
     UI
  ---------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 mb-10">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <ShoppingCart className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                Cart
              </h1>
              <p className="text-xs text-slate-500">{filteredItems.length} items</p>
            </div>
          </div>

          {companies.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {companies.map((company) => (
                <button
                  key={company}
                  onClick={() => setActiveCompany(company)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCompany === company
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  {company === "ALL" ? "All Companies" : company}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-500">Loading cart...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
              <Package size={40} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg font-medium">No items in cart</p>
            <p className="text-slate-400 text-sm mt-1">
              {activeCompany === "ALL" ? "Add items from inventory" : "No items for this company"}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {filteredItems.map((item) => {
                const primaryImage = getPrimaryImage(item)
                const imageArray = Array.isArray(item.imageUrl) ? item.imageUrl : item.imageUrl ? [item.imageUrl] : []
                const isOutOfStock = item.closingQtyPieces <= 0 || !item.CLOSINGQTY

                return (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100"
                  >
                    <div
                      onClick={() => imageArray.length > 0 && openImageModal(item)}
                      className={`relative w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        imageArray.length > 0 ? "cursor-pointer hover:scale-105 transition-transform" : ""
                      }`}
                    >
                      {primaryImage ? (
                        <>
                          <img
                            src={`${API_BASE}/${primaryImage}`}
                            alt={item.NAME}
                            className="w-full h-full object-cover"
                          />
                          {imageArray.length > 1 && (
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 text-white text-[10px] font-semibold rounded-full">
                              +{imageArray.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <Package className="text-slate-300" size={32} />
                      )}
                      {isOutOfStock && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-semibold rounded-full">
                          Out
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-slate-900 truncate">{item.NAME}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{item.companyName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold ${isOutOfStock ? "text-red-600" : "text-emerald-600"}`}>
                          Stock: {item.closingQtyPieces || 0}
                        </span>
                        {isOutOfStock && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                        AED {Number(item.SALESPRICE || 0).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="w-9 h-9 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all hover:scale-105"
                        title="Remove from cart"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 sticky bottom-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  AED {totalAmount.toFixed(2)}
                </span>
              </div>

              <button
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02]"
                onClick={() => alert("Proceed to checkout")}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </main>

      {imageModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Product Images</h2>
              <button
                onClick={() => setImageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">{selectedItem.NAME}</p>

            {(() => {
              const imageArray = Array.isArray(selectedItem.imageUrl)
                ? selectedItem.imageUrl
                : selectedItem.imageUrl
                  ? [selectedItem.imageUrl]
                  : []

              if (imageArray.length === 0) {
                return (
                  <div className="h-80 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="text-slate-300" size={64} />
                  </div>
                )
              }

              return (
                <div className="relative">
                  <div className="relative h-80 bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={`${API_BASE}/${imageArray[currentImageIndex]}`}
                      alt={`${selectedItem.NAME} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />

                    {imageArray.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                        {currentImageIndex + 1} / {imageArray.length}
                      </div>
                    )}
                  </div>

                  {imageArray.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition"
                      >
                        <ChevronLeft size={20} className="text-slate-700" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition"
                      >
                        <ChevronRight size={20} className="text-slate-700" />
                      </button>

                      <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {imageArray.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition ${
                              currentImageIndex === idx
                                ? "border-emerald-500"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <img
                              src={`${API_BASE}/${img}`}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
