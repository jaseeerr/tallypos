"use client"

import { useEffect, useState, useRef } from "react"
import QRCode from "react-qr-code"
import {
  Search,
  X,
  Upload,
  Pencil ,
  Trash2,
  Download,
  Package,
  Grid3x3,
  List,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import MyAxiosInstance from "../../utils/axios"
import { API_BASE } from "../../utils/url"
import CustomAlert from "../../components/CustomAlert"
export default function DataEntry() {
  const axiosInstance = MyAxiosInstance(3)
  const envDataEntryKey = import.meta.env.VITE_DATA_ENTRY_KEY || import.meta.env.DATA_ENTRY_KEY
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [keyError, setKeyError] = useState("")

  const [alert, setAlert] = useState({
  open: false,
  type: "message",
  title: "",
  message: "",
})



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
  const [salesPrice, setSalesPrice] = useState("")
  const [productNote,setProductNote] = useState('')
const [savingPrice, setSavingPrice] = useState(false)

  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [activeCardId, setActiveCardId] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Refs
  const loaderRef = useRef(null)
  const isFetchingRef = useRef(false)
  const loadedIdsRef = useRef(new Set())
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isMountedRef = useRef(false)
  const firstLoadCompleteRef = useRef(false)

  useEffect(() => {
    const storedKey = localStorage.getItem("dataEntryKey")
    if (envDataEntryKey && storedKey === envDataEntryKey) {
      setIsUnlocked(true)
    }
  }, [envDataEntryKey])

  function handleUnlockSubmit(e) {
    e.preventDefault()
    setKeyError("")

    if (!envDataEntryKey) {
      setKeyError("Data entry key is not configured.")
      return
    }

    if (keyInput.trim() === envDataEntryKey) {
      localStorage.setItem("dataEntryKey", envDataEntryKey)
      setIsUnlocked(true)
      return
    }

    setKeyError("Invalid key. Please try again.")
  }

  function addToCart(productId) {
    const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]")
    if (!cartItems.includes(productId)) {
      cartItems.push(productId)
      localStorage.setItem("cartItems", JSON.stringify(cartItems))
    setAlert({
  open: true,
  type: "success",
  title: "Added to Cart",
  message: "Item has been successfully added to your cart.",
})

    } else {
setAlert({
  open: true,
  type: "warning",
  title: "Already in Cart",
  message: "This item is already present in your cart.",
})
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 600)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function fetchInventory(resetPage = false) {
    if (!isUnlocked) {
      return
    }

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
      const res = await axiosInstance.get("/dataEntry/inventory", {
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
    if (!isUnlocked) {
      return
    }

    fetchInventory(true)
    isMountedRef.current = true
  }, [isUnlocked])

  useEffect(() => {
    if (!isUnlocked) {
      return
    }

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
  }, [activeCompany, debouncedSearch, includeOutOfStock, isUnlocked])

  useEffect(() => {
    if (!isUnlocked) {
      return
    }

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
  }, [firstLoadCompleteRef.current, loading, isUnlocked])

  function handleQRDownloadOldStableBigSize(item) {
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

  function handleQRDownload(item) {
  const qrContainer = document.getElementById(`qr-${modalItem._id}`)
  if (!qrContainer) return

  const svg = qrContainer.querySelector("svg")
  if (!svg) return

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)

  // ===== PRINT SETTINGS =====
  const DPI = 300

  // Label size: 2.5 x 1.5 inches
  const LABEL_WIDTH_PX = 2.5 * DPI   // 750
  const LABEL_HEIGHT_PX = 1.5 * DPI  // 450

  const QR_SIZE_PX = 600              // Large, sharp QR
  const QR_TOP_MARGIN = 30
  const TEXT_GAP = 20
  const FONT_SIZE = 48

  // ==========================

  const canvas = document.createElement("canvas")
  canvas.width = LABEL_WIDTH_PX
  canvas.height = LABEL_HEIGHT_PX

  const ctx = canvas.getContext("2d", { alpha: false })
  ctx.imageSmoothingEnabled = false

  const img = new Image()

  img.onload = () => {
    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Center QR horizontally
    const qrX = (canvas.width - QR_SIZE_PX) / 2

    ctx.drawImage(
      img,
      qrX,
      QR_TOP_MARGIN,
      QR_SIZE_PX,
      QR_SIZE_PX
    )

    // Draw text
    ctx.fillStyle = "#000000"
    ctx.font = `bold ${FONT_SIZE}px Arial`
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    ctx.fillText(
      modalItem.NAME,
      canvas.width / 2,
      QR_TOP_MARGIN + QR_SIZE_PX + TEXT_GAP
    )

    // Export PNG (lossless)
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

  img.src =
    "data:image/svg+xml;base64," +
    btoa(unescape(encodeURIComponent(svgString)))
}


  function openModal(item) {
    setModalItem(item)
      setSalesPrice(item.SALESPRICE || "")
      setProductNote(item.note || "")
    setSelectedFiles([])
    // Handle imageUrl as an array
    const imageArray = Array.isArray(item.imageUrl) ? item.imageUrl : item.imageUrl ? [item.imageUrl] : []
    setPreviews(imageArray.map((url) => `${API_BASE}/${url}`))
    setCurrentImageIndex(0)
    setModalOpen(true)
  }

  function openQRModal(item) {
    setModalItem(item)
    setQrModalOpen(true)
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setSelectedFiles(files)
    // Create preview URLs for new files
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  function handleRemoveSelectedImage(indexToRemove) {
    // Calculate the actual index in selectedFiles array
    const existingImagesCount = Array.isArray(modalItem.imageUrl)
      ? modalItem.imageUrl.length
      : modalItem.imageUrl
        ? 1
        : 0
    const selectedFileIndex = indexToRemove - existingImagesCount

    if (selectedFileIndex >= 0 && selectedFileIndex < selectedFiles.length) {
      // Remove from selectedFiles array
      setSelectedFiles((prev) => prev.filter((_, idx) => idx !== selectedFileIndex))
      // Remove from previews array
setPreviews((prev) => {
  const next = prev.filter((_, idx) => idx !== indexToRemove)
  setCurrentImageIndex((idx) => clampIndex(idx, next.length))
  return next
})
      // Adjust current image index if needed
      if (currentImageIndex === indexToRemove) {
        setCurrentImageIndex(Math.max(0, indexToRemove - 1))
      } else if (currentImageIndex > indexToRemove) {
        setCurrentImageIndex((prev) => prev - 1)
      }
    }
  }

  async function handleUpdateSalesPrice() {
  if (!modalItem) return

  try {
    setSavingPrice(true)

    await axiosInstance.put(`/editInventoryItem/${modalItem._id}`, {
      SALESPRICE: salesPrice,
      note:productNote
    })

    // Update modal item locally
    setModalItem((prev) => ({
      ...prev,
      SALESPRICE: salesPrice,
      productNote:productNote
    }))

    // Refresh inventory list
    setInventory([])
    loadedIdsRef.current = new Set()
    pageRef.current = 1
    hasMoreRef.current = true
    isFetchingRef.current = false
    firstLoadCompleteRef.current = false
    setInitialLoading(true)
    fetchInventory(true)

setAlert({
  open: true,
  type: "success",
  title: "Item Updated",
  message: "The item has been successfully updated.",
})
  } catch (err) {
    console.error("Sales price update failed:", err)
setAlert({
  open: true,
  type: "error",
  title: "Update Failed",
  message: "Failed to update the sales price. Please try again.",
})
  } finally {
    setSavingPrice(false)
  }
}


  async function handleUpload() {
    if (selectedFiles.length === 0) {
setAlert({
  open: true,
  type: "warning",
  title: "No Image Selected",
  message: "Please select at least one image before continuing.",
})
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("images", file)
      })

      await axiosInstance.put(`/dataEntry/inventory/add-images/${modalItem._id}`, formData)

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
setAlert({
  open: true,
  type: "error",
  title: "Upload Failed",
  message: "Failed to upload images. Please try again.",
})
      setUploading(false)
    }
  }

  async function handleRemoveImage(imageUrl) {
    try {
      setUploading(true)
      await axiosInstance.put(`/dataEntry/inventory/delete-image/${modalItem._id}`, { imageUrl })

      // Remove from previews
      const imageArray = Array.isArray(modalItem.imageUrl)
        ? modalItem.imageUrl
        : modalItem.imageUrl
          ? [modalItem.imageUrl]
          : []
      const fullUrl = `${API_BASE}/${imageUrl}`
setPreviews((prev) => {
  const next = prev.filter((p) => p !== fullUrl)
  setCurrentImageIndex((idx) => clampIndex(idx, next.length))
  return next
})

      // Update modal item
      setModalItem((prev) => ({
        ...prev,
        imageUrl: imageArray.filter((url) => url !== imageUrl),
      }))

      setUploading(false)

      // Refresh inventory
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
setAlert({
  open: true,
  type: "error",
  title: "Remove Failed",
  message: "Failed to remove the image. Please try again.",
})
      setUploading(false)
    }
  }

  function getPrimaryImage(item) {
    if (!item.imageUrl) return null
    const imageArray = Array.isArray(item.imageUrl) ? item.imageUrl : [item.imageUrl]
    return imageArray.length > 0 ? imageArray[0] : null
  }

  function clampIndex(index, length) {
  if (length === 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

  const isFlutter = !!window.__IS_FLUTTER_APP__;

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/70 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Data Entry Locked</h1>
              <p className="text-xs text-slate-500">Enter the access key to continue</p>
            </div>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Enter data entry key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />

            {keyError && (
              <p className="text-sm text-red-600">{keyError}</p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }


  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
<div className={`flex items-center justify-between mb-4 ${isFlutter === true ? "mt-10" : ""}`}>
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
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2"
                : "space-y-3"
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
              const primaryImage = getPrimaryImage(item)
              const imageArray = Array.isArray(item.imageUrl) ? item.imageUrl : item.imageUrl ? [item.imageUrl] : []

              return (
                <div
                  key={item._id}
                  onClick={() => setActiveCardId((prev) => (prev === item._id ? null : item._id))}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 cursor-pointer"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                    {primaryImage ? (
                      <>
                        <img
                          src={`${API_BASE}/${primaryImage}`}
                          
                          alt={item.NAME}
                            decoding="async"

                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {imageArray.length > 1 && (
                          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 text-white text-[10px] font-semibold rounded-full">
                            +{imageArray.length - 1}
                          </div>
                        )}
                      </>
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
                        <p className={`text-sm font-semibold ${isOutOfStock ? "text-red-300" : "text-emerald-300"}`}>
                          Stock: {item.CLOSINGQTY || "0"}
                          {item.closingQtyPieces !== undefined && ` (${item.closingQtyPieces} pcs)`}
                        </p>
                        {item?.note &&
                        <p className="text-emerald-300 font-bold text-sm mb-1">
                          Note: {item.note }
                        </p>
                         }
                        

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
                          <Pencil  size={14} className="text-slate-700" />
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
     <div className="space-y-4">
  {inventory.map((item) => {
    const isOutOfStock = item.closingQtyPieces <= 0 || !item.CLOSINGQTY
    const primaryImage = getPrimaryImage(item)

    return (
      <div
        key={item._id}
        className="bg-white border border-slate-200 rounded-xl p-3"
      >
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-3">
          
          {/* IMAGE */}
          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
            {primaryImage ? (
              <img
                src={`${API_BASE}/${primaryImage}`}
                alt={item.NAME}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <Package size={18} className="text-slate-400" />
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={(e) => {
                            e.stopPropagation()
                            openQRModal(item)
                          }}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Download size={14} />
            </button>
            <button
              onClick={(e) => {
                            e.stopPropagation()
                            openModal(item)
                          }}
                           className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Pencil  size={14} className="text-blue-600" />
            </button>
            <button 
             onClick={(e) => {
                            e.stopPropagation()
                            addToCart(item._id)
                          }}
            className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ShoppingCart size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {item.NAME}
          </h3>

          <p className="text-xs text-slate-500 truncate">
            {item.GROUP || "Uncategorized"}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className={`text-xs font-semibold ${
                isOutOfStock ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {item.CLOSINGQTY || "0"}
            </span>

            {item.closingQtyPieces !== undefined && (
              <span className="text-xs text-slate-400">
                ({item.closingQtyPieces} pcs)
              </span>
            )}

            {isOutOfStock && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full">
                Out of Stock
              </span>
            )}
          </div>
          <p className=" text-slate-500 truncate">
            {item?.note || ""}
          </p>
        </div>
      </div>
    )
  })}
</div>




        )}

        {!initialLoading && hasMore && (
          <div ref={loaderRef} className="py-8 text-center">
            {loading && <div className="text-slate-500 text-sm">Loading more...</div>}
          </div>
        )}
      </main>

      {modalOpen && modalItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Manage Item</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">{modalItem.NAME}</p>

            {previews.length > 0 && (
              <div className="relative mb-4">
                <div className="relative h-80 bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={previews[currentImageIndex] || "/placeholder.svg"}
                    alt={`Preview ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />

                  {currentImageIndex <
                  (Array.isArray(modalItem.imageUrl) ? modalItem.imageUrl.length : modalItem.imageUrl ? 1 : 0) ? (
                    // Delete button for existing images (uploaded to server)
                    <button
                      onClick={() => {
                        const imageArray = Array.isArray(modalItem.imageUrl)
                          ? modalItem.imageUrl
                          : modalItem.imageUrl
                            ? [modalItem.imageUrl]
                            : []
                        handleRemoveImage(imageArray[currentImageIndex])
                      }}
                      disabled={uploading}
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition disabled:opacity-50"
                      title="Delete this image"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemoveSelectedImage(currentImageIndex)}
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition"
                      title="Remove this image"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {/* Image counter */}
                  {previews.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                      {currentImageIndex + 1} / {previews.length}
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                {previews.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? previews.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition"
                    >
                      <ChevronLeft size={20} className="text-slate-700" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === previews.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition"
                    >
                      <ChevronRight size={20} className="text-slate-700" />
                    </button>
                  </>
                )}

                {/* Thumbnail strip */}
                {previews.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {previews.map((preview, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition ${
                          currentImageIndex === idx ? "border-blue-500" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={preview || "/placeholder.svg"}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

         <div className="mb-6">
  <label className="block text-sm font-semibold text-slate-700 mb-2">
    Sales Price
  </label>

  <div className="flex flex-col gap-3">
    {/* Sales Price */}
    <input
      type="number"
      step="0.01"
      value={salesPrice}
      onChange={(e) => setSalesPrice(e.target.value)}
      placeholder="Sales Price (AED)"
      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
    />
 <label className="block text-sm font-semibold text-slate-700">
    Product Note
  </label>
    {/* Note */}
    <textarea
      rows={3}
      value={productNote}
      onChange={(e) => setProductNote(e.target.value)}
      placeholder="Add internal note for this item..."
      className="w-full resize-none px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
    />

    {/* Save Button */}
    <button
      onClick={handleUpdateSalesPrice}
      disabled={savingPrice}
      className="self-end px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50"
    >
      {savingPrice ? "Saving..." : "Save Changes"}
    </button>
  </div>
</div>




            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />

            <div className="flex gap-2">
              <label
                htmlFor="file-upload"
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-center cursor-pointer transition"
              >
                Choose Files
              </label>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal - No changes needed */}
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

            <div className="bg-slate-50 p-6 rounded-xl mb-4" id={`qr-${modalItem._id}`}>
              <QRCode value={modalItem._id} size={256} className="w-full h-auto" />
            </div>

            <p className="text-sm font-medium text-slate-700 mb-4 text-center">{modalItem.NAME}</p>

            <button
              onClick={() => handleQRDownload(modalItem)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download QR Code
            </button>
          </div>
        </div>
      )}

      <CustomAlert
  open={alert.open}
  type={alert.type}
  title={alert.title}
  message={alert.message}
  onClose={() => setAlert({ ...alert, open: false })}
/>


    </div>
  )
}
