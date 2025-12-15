"use client"

import { useEffect, useState, useRef } from "react"
import QRCode from "react-qr-code"
import { Search, X, Upload, Trash2, Download, Package, Grid3x3, List } from "lucide-react"
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch inventory with proper guards to prevent multiple calls
  async function fetchInventory(resetPage = false) {
    // Guard: prevent concurrent requests
    if (isFetchingRef.current) {
      return
    }

    // Guard: check if more data available
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
        // Full reset for new search/filter
        loadedIdsRef.current = new Set(newItems.map((i) => i._id))
        setInventory(newItems)
        pageRef.current = 2
      } else {
        // Append for infinite scroll
        const uniqueItems = newItems.filter((item) => !loadedIdsRef.current.has(item._id))
        uniqueItems.forEach((item) => loadedIdsRef.current.add(item._id))
        setInventory((prev) => [...prev, ...uniqueItems])
        pageRef.current = currentPage + 1
      }

      // Update hasMore
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
    // Guard: don't run on first render
    if (!isMountedRef.current) {
      return
    }

    // Full reset and fetch
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
    // Guard: don't observe until first page is loaded
    if (!firstLoadCompleteRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        // Only fetch if: intersecting, has more data, not currently fetching, page > 1
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

  // QR Download - Fixed version
  function handleQRDownload(item) {
    const qrContainer = document.getElementById(`qr-${modalItem._id}`)
    if (!qrContainer) return

    const svgElement = qrContainer.querySelector("svg")
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    // Set high resolution
    const scale = 4
    canvas.width = 256 * scale
    canvas.height = 256 * scale

    img.onload = () => {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

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
            {["ALL", "AMANA", "FANCY-PALACE-TRADING-LLC"].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCompany(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCompany === c
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {c === "ALL"
                  ? "All"
                  : c
                      .split("-")
                      .map((w) => w[0])
                      .join("")}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {initialLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="w-full h-48 bg-slate-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => {
              const isOutOfStock = item.closingQtyPieces <= 0 || !item.CLOSINGQTY

              return (
               <div
  key={item._id}
  onClick={() =>
    setActiveCardId((prev) => (prev === item._id ? null : item._id))
  }
  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 cursor-pointer"
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
                        <Package className="text-slate-300" size={64} />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full shadow-lg">
                        Out of Stock
                      </div>
                    )}
<div
  className={`
    absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300
    bg-black/40
    ${activeCardId === item._id ? "opacity-100" : "opacity-0"}
    group-hover:opacity-100
  `}
>
                <button
  onClick={(e) => {
    e.stopPropagation()
    openQRModal(item)
  }}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        title="View QR Code"
                      >
                        <Download size={18} className="text-slate-700" />
                      </button>
                     <button
  onClick={(e) => {
    e.stopPropagation()
    openModal(item)
  }}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        title="Edit Image"
                      >
                        <Upload size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2" title={item.NAME}>
                      {item.NAME}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">{item.GROUP || "Uncategorized"}</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-sm font-semibold ${isOutOfStock ? "text-red-600" : "text-green-600"}`}>
                          {item.CLOSINGQTY || "0"}
                        </span>
                        {item.closingQtyPieces !== undefined && (
                          <span className="text-xs text-slate-400 ml-2">({item.closingQtyPieces} pcs)</span>
                        )}
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
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-3 flex items-center gap-3 border border-slate-100"
                >
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}/${item.imageUrl}`}
                        alt={item.NAME}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-slate-300" size={24} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate text-sm">{item.NAME}</h3>
                    <p className="text-xs text-slate-500">{item.GROUP || "Uncategorized"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold ${isOutOfStock ? "text-red-600" : "text-green-600"}`}>
                        {item.CLOSINGQTY || "0"}
                      </span>
                      {item.closingQtyPieces !== undefined && (
                        <span className="text-xs text-slate-400">({item.closingQtyPieces} pcs)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openQRModal(item)}
                      className="w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                      title="View QR"
                    >
                      <Download size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => openModal(item)}
                      className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
                      title="Edit"
                    >
                      <Upload size={16} className="text-slate-600" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div ref={loaderRef} className="py-8 flex justify-center">
          {!initialLoading && loading && (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Loading more...</span>
            </div>
          )}
        </div>
      </main>

      {qrModalOpen && modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl transform animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">QR Code</h2>
              <button
                onClick={() => setQrModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 mb-4">
              <div id={`qr-${modalItem._id}`} className="flex justify-center">
                <QRCode value={modalItem._id} size={200} />
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 text-center line-clamp-2">{modalItem.NAME}</p>

            <button
              onClick={() => handleQRDownload(modalItem)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download QR
            </button>
          </div>
        </div>
      )}

      {modalOpen && modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl transform animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Edit Image</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-slate-800 mb-1">{modalItem.NAME}</p>
              <p className="text-sm text-slate-500">{modalItem.GROUP || "Uncategorized"}</p>
            </div>

            <div className="mb-4">
              <div className="relative w-full h-64 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden border-2 border-dashed border-slate-200">
                {preview ? (
                  <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Package size={48} />
                    <p className="text-sm mt-2">No image available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <label className="flex-1 px-4 py-3 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2">
                <Upload size={18} />
                Choose File
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>

              {preview && (
                <button
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="px-4 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Remove
                </button>
              )}
            </div>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Image
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
