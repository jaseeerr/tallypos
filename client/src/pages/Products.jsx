"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import QRCode from "react-qr-code"
import { Search, X, Upload, Trash2, Download, Package, Grid3x3, List } from "lucide-react"
import MyAxiosInstance from "../utils/axios"
import { API_BASE } from "../utils/url"

export default function InventoryPage() {
  const axiosInstance = MyAxiosInstance()

  // =====================
  // STATE
  // =====================
  const [inventory, setInventory] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false)
  const [viewMode, setViewMode] = useState("grid") // grid or list

  const [page, setPage] = useState(1)
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

  const loaderRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const loadedIdsRef = useRef(new Set()) // Track loaded IDs to prevent duplicates

  // =====================
  // DEBOUNCED SEARCH
  // =====================
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // =====================
  // PARSE STOCK STRING → PIECES
  // =====================
  const parseStockToPieces = useCallback((str) => {
    if (!str || typeof str !== "string") return 0

    const UNIT_MAP = {
      doz: 12,
      dozen: 12,
      pc: 1,
      pcs: 1,
      piece: 1,
      pieces: 1,
      gross: 144,
    }

    const lower = str.toLowerCase()
    const regex = /(\d+)\s*(doz|dozen|pc|pcs|piece|pieces|gross)/g

    let total = 0
    let match

    while ((match = regex.exec(lower)) !== null) {
      const qty = Number.parseInt(match[1], 10)
      const unit = match[2]
      total += qty * (UNIT_MAP[unit] || 1)
    }

    return total
  }, [])

  // =====================
  // FETCH INVENTORY (PAGINATED)
  // =====================
  const fetchInventory = useCallback(
    async (reset = false) => {
      if (loading) return

      try {
        setLoading(true)

        const currentPage = reset ? 1 : page

        const res = await axiosInstance.get("/inventory", {
          params: {
            companyName: activeCompany,
            search: debouncedSearch,
            page: currentPage,
            limit: 100,
          },
        })
console.log(res)
        const newItems = res.data.items || []

        const uniqueNewItems = newItems.filter((item) => {
          if (reset) return true // Allow all items on reset
          if (loadedIdsRef.current.has(item._id)) {
            return false // Skip duplicates
          }
          return true
        })

        if (reset) {
          loadedIdsRef.current = new Set(uniqueNewItems.map((item) => item._id))
          setInventory(uniqueNewItems)
          setPage(2)
        } else {
          uniqueNewItems.forEach((item) => loadedIdsRef.current.add(item._id))
          setInventory((prev) => [...prev, ...uniqueNewItems])
          setPage((prev) => prev + 1)
        }

        setHasMore(newItems.length > 0)
        setInitialLoading(false)
      } catch (err) {
        console.error("Inventory fetch error:", err)
        setInitialLoading(false)
      }

      setLoading(false)
    },
    [loading, page, activeCompany, debouncedSearch, axiosInstance],
  )

  // =====================
  // RESET & RELOAD ON FILTERS
  // =====================
  useEffect(() => {
    setInventory([])
    setPage(1)
    setHasMore(true)
    loadedIdsRef.current = new Set() // Reset loaded IDs tracker
    fetchInventory(true)
  }, [activeCompany, debouncedSearch])

  // =====================
  // INFINITE SCROLL OBSERVER
  // =====================
  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0]
      if (target.isIntersecting && hasMore && !loading && inventory.length > 0) {
        fetchInventory(false)
      }
    },
    [hasMore, loading, fetchInventory, inventory.length],
  )

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    }
    const observer = new IntersectionObserver(handleObserver, option)
    if (loaderRef.current) observer.observe(loaderRef.current)

    return () => observer.disconnect()
  }, [handleObserver])

  // =====================
  // FILTER FRONTEND (OUT-OF-STOCK)
  // =====================
  const filteredList = useMemo(() => {
    return inventory.filter((item) => {
      const stock = parseStockToPieces(item.CLOSINGQTY)
      if (!includeOutOfStock && stock <= 0) return false
      return true
    })
  }, [inventory, includeOutOfStock, parseStockToPieces])

  // =====================
  // QR DOWNLOAD - HIGH QUALITY, QR ONLY
  // =====================
  const handleQRDownload = useCallback((item) => {
    const qrSize = 512
    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svgElement.setAttribute("width", qrSize)
    svgElement.setAttribute("height", qrSize)
    svgElement.setAttribute("viewBox", `0 0 ${qrSize} ${qrSize}`)

    const tempContainer = document.createElement("div")
    tempContainer.style.position = "absolute"
    tempContainer.style.left = "-9999px"
    document.body.appendChild(tempContainer)

    const root = document.createElement("div")
    tempContainer.appendChild(root)

    // Use React to render QR code
    const qrElement = React.createElement(QRCode, {
      value: String(item.NAME || "ITEM"),
      size: qrSize,
      level: "H", // Highest error correction
    })

    const { createRoot } = require("react-dom/client")
    const reactRoot = createRoot(root)
    reactRoot.render(qrElement)

    // Wait for render then download
    setTimeout(() => {
      const renderedSvg = root.querySelector("svg")
      if (renderedSvg) {
        const svgData = new XMLSerializer().serializeToString(renderedSvg)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = qrSize
          canvas.height = qrSize

          const ctx = canvas.getContext("2d")
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, qrSize, qrSize)
          ctx.drawImage(img, 0, 0, qrSize, qrSize)

          canvas.toBlob(
            (blob) => {
              const pngUrl = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = pngUrl
              link.download = `QR-${item.NAME.replace(/[^a-zA-Z0-9]/g, "-")}.png`
              link.click()

              URL.revokeObjectURL(url)
              URL.revokeObjectURL(pngUrl)
            },
            "image/png",
            1.0,
          )
        }

        img.src = url
      }

      document.body.removeChild(tempContainer)
      reactRoot.unmount()
    }, 100)
  }, [])

  // =====================
  // IMAGE MODAL FUNCTIONS
  // =====================
  const openModal = useCallback((item) => {
    setModalItem(item)
    setSelectedFile(null)
    setPreview(item.imageUrl ? `${API_BASE}/${item.imageUrl}` : null)
    setModalOpen(true)
  }, [])

  const openQRModal = useCallback((item) => {
    setModalItem(item)
    setQrModalOpen(true)
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }, [])

  const handleUpload = async () => {
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
      fetchInventory(true)
    } catch (err) {
      console.error("Image upload error:", err)
      alert("Failed to upload image")
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      setUploading(true)
      await axiosInstance.put(`/inventory/remove-image/${modalItem._id}`)
      setUploading(false)
      setModalOpen(false)
      fetchInventory(true)
    } catch (err) {
      console.error("Remove image error:", err)
      alert("Failed to remove image")
      setUploading(false)
    }
  }

  // =====================
  // RENDER UI
  // =====================
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
                <p className="text-xs text-slate-500">{filteredList.length} items</p>
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
          // Skeleton loading
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="w-full h-48 bg-slate-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="text-slate-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No items found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const stock = parseStockToPieces(item.CLOSINGQTY)
              const isOutOfStock = stock <= 0

              return (
                <div
                  key={item._id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100"
                >
                  {/* Image section */}
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
                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => openQRModal(item)}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        title="View QR Code"
                      >
                        <Download size={18} className="text-slate-700" />
                      </button>
                      <button
                        onClick={() => openModal(item)}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        title="Edit Image"
                      >
                        <Upload size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </div>

                  {/* Content section */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2" title={item.NAME}>
                      {item.NAME}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">{item.GROUP || "Uncategorized"}</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500">Stock</div>
                        <div className={`text-sm font-bold ${isOutOfStock ? "text-red-600" : "text-green-600"}`}>
                          {item.CLOSINGQTY || "0"}
                        </div>
                        <div className="text-xs text-slate-400">{stock} pcs</div>
                      </div>

                      <button
                        onClick={() => openQRModal(item)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                      >
                        QR Code
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((item) => {
              const stock = parseStockToPieces(item.CLOSINGQTY)
              const isOutOfStock = stock <= 0

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-3 flex items-center gap-3 border border-slate-100"
                >
                  {/* Thumbnail */}
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate text-sm">{item.NAME}</h3>
                    <p className="text-xs text-slate-500">{item.GROUP || "Uncategorized"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold ${isOutOfStock ? "text-red-600" : "text-green-600"}`}>
                        {item.CLOSINGQTY || "0"}
                      </span>
                      <span className="text-xs text-slate-400">({stock} pcs)</span>
                    </div>
                  </div>

                  {/* Actions */}
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
          {loading && (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Loading more...</span>
            </div>
          )}
          {!hasMore && filteredList.length > 0 && <p className="text-sm text-slate-400">You've reached the end</p>}
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">QR Code</h3>
              <button
                onClick={() => setQrModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 mb-4">
              <QRCode value={String(modalItem.NAME || "ITEM")} size={256} level="H" className="w-full h-auto" />
            </div>

            <p className="text-sm text-slate-600 text-center mb-4 font-medium">{modalItem.NAME}</p>

            <button
              onClick={() => {
                handleQRDownload(modalItem)
                setQrModalOpen(false)
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download High Quality QR
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
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl transform animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Edit Image</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4 font-medium">{modalItem.NAME}</p>

            {/* Image preview */}
            <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden mb-4 border-2 border-slate-100">
              {preview ? (
                <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="text-slate-300" size={80} />
                </div>
              )}
            </div>

            {/* File input */}
            <label className="block w-full mb-4">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
              <div className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <Upload className="inline-block mr-2 text-slate-500" size={20} />
                <span className="text-sm font-medium text-slate-600">
                  {selectedFile ? selectedFile.name : "Choose Image"}
                </span>
              </div>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              {modalItem.imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Remove
                </button>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
