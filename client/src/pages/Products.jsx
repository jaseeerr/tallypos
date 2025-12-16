"use client"

import { useEffect, useState, useRef } from "react"
import QRCode from "react-qr-code"
import { Search, X, Upload, Trash2, Download, Package, Grid3x3, List, ShoppingCart } from "lucide-react"
import MyAxiosInstance from "../utils/axios"
import { API_BASE } from "../utils/url"

export default function InventoryPage() {
  const axiosInstance = MyAxiosInstance()

  // State
  const [inventory, setInventory] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false)
  const [viewMode, setViewMode] = useState("grid")
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [activeCardId, setActiveCardId] = useState(null)

  // Refs
  const loaderRef = useRef(null)
  const isFetchingRef = useRef(false)
  const loadedIdsRef = useRef(new Set())
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isMountedRef = useRef(false)
  const firstLoadCompleteRef = useRef(false)

  function addToCart(productId) {
    const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]")
    if (!cartItems.includes(productId)) {
      cartItems.push(productId)
      localStorage.setItem("cartItems", JSON.stringify(cartItems))
      alert("Item added to cart!")
    } else {
      alert("Item already in cart!")
    }
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch inventory with proper guards to prevent multiple calls
  async function fetchInventory(resetPage = false) {
    if (isFetchingRef.current) {
      return
    }

    if (!resetPage && !hasMoreRef.current) {
      return
    }

    const currentPage = resetPage ? 1 : pageRef.current
    isFetchingRef.current = true
    setLoading(true)

    try {
      const res = await axiosInstance.get("/inventory", {
        params: {
          companyName: activeCompany,
          search: debouncedSearch,
          page: currentPage,
          limit: 100,
          includeOutOfStock: includeOutOfStock,
        },
      })

      const newItems = res.data.items || []
      console.log(newItems)

      if (resetPage) {
        loadedIdsRef.current = new Set(newItems.map((i) => i._id))
        setInventory(newItems)
        pageRef.current = 2
      } else {
        const uniqueItems = newItems.filter((item) => !loadedIdsRef.current.has(item._id))
        uniqueItems.forEach((item) => loadedIdsRef.current.add(item._id))
        setInventory((prev) => [...prev, ...uniqueItems])
        pageRef.current = currentPage + 1
      }

      const moreDataAvailable = newItems.length === 100
      hasMoreRef.current = moreDataAvailable
      setHasMore(moreDataAvailable)

      if (resetPage) {
        setInitialLoading(false)
        firstLoadCompleteRef.current = true
      }
    } catch (err) {
      console.error("Inventory fetch error:", err)
      setInitialLoading(false)
      firstLoadCompleteRef.current = true
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchInventory(true)
    isMountedRef.current = true
  }, [])

  useEffect(() => {
    if (!isMountedRef.current) {
      return
    }

    setInventory([])
    loadedIdsRef.current = new Set()
    pageRef.current = 1
    hasMoreRef.current = true
    setHasMore(true)
    isFetchingRef.current = false
    firstLoadCompleteRef.current = false
    setInitialLoading(true)

    fetchInventory(true)
  }, [activeCompany, debouncedSearch, includeOutOfStock])

  // Infinite scroll observer
  useEffect(() => {
    if (!firstLoadCompleteRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (entry.isIntersecting && hasMoreRef.current && !isFetchingRef.current && !loading && pageRef.current > 1) {
          fetchInventory(false)
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [firstLoadCompleteRef.current, loading])

  // QR Download
  function handleQRDownload(item) {
    const qrContainer = document.getElementById(`qr-${modalItem._id}`)
    if (!qrContainer) return

    const svgElement = qrContainer.querySelector("svg")
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { alpha: false })
    ctx.imageSmoothingEnabled = false
    const img = new Image()

    const scale = 4
    const qrSize = 256 * scale
    const padding = 5 * scale
    const textGap = 12 * scale
    const fontSize = 18 * scale
    const bottomPadding = 3 * scale

    canvas.width = qrSize + padding * 2
    canvas.height = padding + qrSize + textGap + fontSize + bottomPadding

    img.onload = () => {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.drawImage(img, padding, padding, qrSize, qrSize)

      ctx.fillStyle = "#000000"
      ctx.font = `${18 * scale}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "top"

      ctx.fillText(`${modalItem.NAME}`, canvas.width / 2, padding + qrSize + textGap)

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `QR-${item.NAME.replace(/[^a-zA-Z0-9]/g, "-")}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, "image/png")
    }

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  // Modal functions
  function openModal(item) {
    setModalItem(item)
    setSelectedFile(null)
    setPreview(item.imageUrl ? `${API_BASE}/${item.imageUrl}` : null)
    setModalOpen(true)
  }

  function openQRModal(item) {
    setModalItem(item)
    setQrModalOpen(true)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    if (!selectedFile) {
      alert("Select an image first!")
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("image", selectedFile)

      await axiosInstance.put(`/inventory/update-image/${modalItem._id}`, formData)

      setUploading(false)
      setModalOpen(false)

      setInventory([])
      loadedIdsRef.current = new Set()
      pageRef.current = 1
      hasMoreRef.current = true
      isFetchingRef.current = false
      firstLoadCompleteRef.current = false
      setInitialLoading(true)
      fetchInventory(true)
    } catch (err) {
      console.error("Image upload error:", err)
      alert("Failed to upload image")
      setUploading(false)
    }
  }

  async function handleRemoveImage() {
    try {
      setUploading(true)
      await axiosInstance.put(`/inventory/remove-image/${modalItem._id}`)
      setUploading(false)
      setModalOpen(false)

      setInventory([])
      loadedIdsRef.current = new Set()
      pageRef.current = 1
      hasMoreRef.current = true
      isFetchingRef.current = false
      firstLoadCompleteRef.current = false
      setInitialLoading(true)
      fetchInventory(true)
    } catch (err) {
      console.error("Remove image error:", err)
      alert("Failed to remove image")
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Package className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Inventory
                </h1>
                <p className="text-xs text-slate-500">{inventory.length} items</p>
              </div>
            </div>

            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["ALL", "AMANA-FIRST-TRADING-LLC", "FANCY-PALACE-TRADING-LLC"].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCompany(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCompany === c
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {c === "ALL" ? "All" : c}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={includeOutOfStock}
                onChange={(e) => setIncludeOutOfStock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-sm"></div>
            </div>
            <span className="text-sm text-slate-600 font-medium">Show out of stock</span>
          </label>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 py-6">
        {initialLoading ? (
          <div
            className={
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2" : "space-y-3"
            }
          >
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-2 shadow-sm animate-pulse">
                <div className="w-full aspect-square bg-slate-200 rounded-lg mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="text-slate-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No items found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : viewMode === "grid" ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {inventory.map((item) => {
              const isOutOfStock = item.closingQtyPieces <= 0 || !item.CLOSINGQTY

              return (
                <div
                  key={item._id}
                  onClick={() => setActiveCardId((prev) => (prev === item._id ? null : item._id))}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 cursor-pointer"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}/${item.imageUrl}`}
                        alt={item.NAME}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-slate-300" size={48} />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute top-1 right-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full shadow-lg">
                        Out
                      </div>
                    )}

                  <div
  className={`
    absolute inset-0 flex flex-col items-center justify-center gap-2
    bg-black/60 backdrop-blur-sm p-3
    transition-opacity duration-300
    ${activeCardId === item._id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
    group-hover:opacity-100 group-hover:pointer-events-auto
  `}
>

                      {/* Product Details */}
                      <div className="text-center mb-2">
                        <h3 className="text-white font-bold text-xs mb-1 line-clamp-2" title={item.NAME}>
                          {item.NAME}
                        </h3>
                        <p className="text-emerald-300 font-bold text-sm mb-1">
                          AED {Number(item.SALESPRICE || 0).toFixed(2)}
                        </p>
                        <p className={`text-xs font-semibold ${isOutOfStock ? "text-red-300" : "text-emerald-300"}`}>
                          Stock: {item.CLOSINGQTY || "0"}
                          {item.closingQtyPieces !== undefined && ` (${item.closingQtyPieces} pcs)`}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openQRModal(item)
                          }}
                          className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          title="View QR Code"
                        >
                          <Download size={14} className="text-slate-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openModal(item)
                          }}
                          className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          title="Edit Image"
                        >
                          <Upload size={14} className="text-slate-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(item._id)
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          title="Add to Cart"
                        >
                          <ShoppingCart size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.map((item) => {
              const isOutOfStock = item.closingQtyPieces <= 0 || !item.CLOSINGQTY

              return (
                <div
                  key={item._id}
                  className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}/${item.imageUrl}`}
                        alt={item.NAME}
                        className="w-full h-full object-cover rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="text-slate-400" size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{item.NAME}</h3>
                    <p className="text-xs text-slate-500">{item.GROUP || "Uncategorized"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold ${isOutOfStock ? "text-red-600" : "text-emerald-600"}`}>
                        {item.CLOSINGQTY || "0"}
                      </span>
                      {item.closingQtyPieces !== undefined && (
                        <span className="text-xs text-slate-400">({item.closingQtyPieces} pcs)</span>
                      )}
                      {isOutOfStock && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                          OUT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                      AED {Number(item.SALESPRICE || 0).toFixed(2)}
                    </span>

                    <button
                      onClick={() => openQRModal(item)}
                      className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      title="View QR"
                    >
                      <Download size={14} className="text-slate-600" />
                    </button>

                    <button
                      onClick={() => openModal(item)}
                      className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      title="Edit"
                    >
                      <Upload size={14} className="text-slate-600" />
                    </button>

                    <button
                      onClick={() => addToCart(item._id)}
                      className="w-8 h-8 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center"
                      title="Add to Cart"
                    >
                      <ShoppingCart size={14} className="text-white" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div ref={loaderRef} className="py-8 flex justify-center">
          {!initialLoading && loading && (
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          )}
          {!initialLoading && !loading && !hasMore && inventory.length > 0 && (
            <p className="text-slate-400 text-sm">No more items to load</p>
          )}
        </div>
      </main>

      {/* Image Upload Modal */}
      {modalOpen && modalItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Edit Image</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">{modalItem.NAME}</p>

            {preview && (
              <div className="relative mb-4">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                {modalItem.imageUrl && !selectedFile && (
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}

            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />

            <div className="flex gap-2">
              <label
                htmlFor="file-upload"
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center cursor-pointer transition"
              >
                Choose File
              </label>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModalOpen && modalItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">QR Code</h2>
              <button
                onClick={() => setQrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">{modalItem.NAME}</p>

            <div id={`qr-${modalItem._id}`} className="bg-white p-4 rounded-lg flex flex-col items-center gap-3">
              <QRCode value={modalItem._id} size={256} />
              <p className="text-sm font-medium text-slate-700 text-center">{modalItem.NAME}</p>
            </div>

            <button
              onClick={() => handleQRDownload(modalItem)}
              className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
