"use client"

import { useEffect, useState, useMemo } from "react"
import { Trash2, Package } from "lucide-react"
import MyAxiosInstance from "../utils/axios"
import { API_BASE } from "../utils/url"

export default function CartPage() {
  const axiosInstance = MyAxiosInstance()

  const [cartItems, setCartItems] = useState([])
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [loading, setLoading] = useState(true)

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
     const res = await axiosInstance.post("/inventory/bulk", {
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
    const updatedIds = JSON.parse(localStorage.getItem("cartItems") || "[]").filter(
      (pid) => pid !== id
    )

    localStorage.setItem("cartItems", JSON.stringify(updatedIds))
    setCartItems((prev) => prev.filter((item) => item._id !== id))
  }

  /* ----------------------------------
     Derived Data
  ---------------------------------- */

  const companies = useMemo(() => {
    const unique = new Set(cartItems.map((i) => i.companyName))
    return ["ALL", ...Array.from(unique)]
  }, [cartItems])

  const filteredItems =
    activeCompany === "ALL"
      ? cartItems
      : cartItems.filter((i) => i.companyName === activeCompany)

  const totalAmount = filteredItems.reduce(
    (sum, item) => sum + Number(item.SALESPRICE || 0),
    0
  )

  /* ----------------------------------
     UI
  ---------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-2xl font-bold mb-4">Cart</h1>

        {/* Company Tabs */}
        {companies.length > 1 && (
          <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
            {companies.map((company) => (
              <button
                key={company}
                onClick={() => setActiveCompany(company)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeCompany === company
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white border text-slate-700 hover:bg-slate-100"
                }`}
              >
                {company === "ALL" ? "All Companies" : company}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <p className="text-slate-500">Loading cart...</p>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-slate-300 mb-3" />
            <p className="text-slate-500">No items for this company</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}/${item.imageUrl}`}
                        alt={item.NAME}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <Package className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{item.NAME}</h3>
                    <p className="text-xs text-slate-500">{item.companyName}</p>
                    <p className="text-xs text-slate-500">
                      Stock: {item.closingQtyPieces}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      AED {Number(item.SALESPRICE || 0).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="mt-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>AED {totalAmount.toFixed(2)}</span>
              </div>

              <button
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
                onClick={() => alert("Proceed to checkout")}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
