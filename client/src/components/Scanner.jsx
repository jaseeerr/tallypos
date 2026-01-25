"use client"

import { useEffect, useRef, useState } from "react"
import QRBarcodeScanner from "react-qr-barcode-scanner"
import {
  Camera,
  X,
  Package,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
  ImageIcon
} from "lucide-react"
import MyAxiosInstance from "../utils/axios"
import { API_BASE } from "../utils/url"
import CustomAlert from "./CustomAlert"
function Scanner() {
  const [alert, setAlert] = useState({
  open: false,
  type: "message",
  title: "",
  message: "",
})

  const axios = MyAxiosInstance()
  const lastScannedRef = useRef(null)

  const [companyName] = useState("") // 🔧 change if needed
  const [isFlutterApp, setIsFlutterApp] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [loadingScan, setLoadingScan] = useState(false)
  const [scannerError, setScannerError] = useState(null)
  const [product, setProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)

  /* Detect Flutter */
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsFlutterApp(!!window.FlutterScanQR)
    }
  }, [])

  /* Flutter scan bridge */
 useEffect(() => {
  if (!isFlutterApp) return

  window.onFlutterQrScanned = (code) => {
    if (code) handleScan(code)
  }

  window.onFlutterQrClosed = () => {
    setScannerOpen(false)
    setProduct(null)
    setShowProductModal(false)
    setScannerError(null)
    lastScannedRef.current = null
  }

  return () => {
    delete window.onFlutterQrScanned
    delete window.onFlutterQrClosed
  }
}, [isFlutterApp])

  const fetchProductById = async (id) => {
    const res = await axios.post(`/inventory/${id}`, { companyName })
    if (!res.data?.ok) throw new Error("Product not found")
    return res.data.product
  }

  const handleScan = async (code) => {
    if (!code || loadingScan) return
    const trimmed = code.trim()
    if (lastScannedRef.current === trimmed) return
    lastScannedRef.current = trimmed

    try {
      setLoadingScan(true)
      setScannerError(null)

      const prod = await fetchProductById(trimmed)

      // if (prod.companyName !== companyName) {
      //   throw new Error(`Product belongs to ${prod.companyName}`)
      // }

      setProduct(prod)
      setShowProductModal(true)
    } catch (err) {
      setScannerError(err.message || "Scan failed")
      lastScannedRef.current = null
    } finally {
      setLoadingScan(false)
    }
  }

  const getStockInfo = (item) =>
    Object.keys(item)
      .filter(k => k.endsWith("Stock") && !k.toLowerCase().includes("isoutof"))
      .map(k => {
        const company = k.replace("Stock", "")
        return {
          company,
          gross: item[k],
          net: item[`${company}-NetAvailable`],
          pending: item[`${company}-UnsyncedQty`] ?? 0
        }
      })

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



  return (
<div className="w-full max-h-screen py-2">
      <button
        onClick={() => {
          setProduct(null)
          setShowProductModal(false)
          setScannerError(null)
          lastScannedRef.current = null

          if (window.FlutterScanQR?.postMessage) {
            window.FlutterScanQR.postMessage("open")
          }
          else
          {
                      setScannerOpen(true)

          }
        }}
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
      >
        <Camera className="w-5 h-5" />
        Scan Product
      </button>

      {/* SCANNER MODAL */}
      {scannerOpen && !isFlutterApp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-purple-600 to-indigo-600">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Scan Product
              </h2>
              <button
                onClick={() => {
                  setScannerOpen(false)
                  setProduct(null)
                  lastScannedRef.current = null
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg"
              >
                <X />
              </button>
            </div>

            {/* SCANNER */}
            {!product && (
              <div className="p-6 space-y-4">
                {!isFlutterApp && (
                  <QRBarcodeScanner
                    onUpdate={(err, data) => {
                      if (data?.text) handleScan(data.text)
                    }}
                    style={{ width: "100%" }}
                  />
                )}

                {loadingScan && (
                  <p className="text-center text-blue-600 font-medium">
                    Loading product...
                  </p>
                )}

                {scannerError && (
                  <p className="text-center text-red-600 font-medium">
                    {scannerError}
                  </p>
                )}
              </div>
            )}

            {/* PRODUCT MODAL */}
          
          </div>
        </div>
      )}




        {showProductModal && product && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="flex justify-between items-center p-5 bg-gradient-to-r from-emerald-600 to-emerald-700">
        <h2 className="text-white font-bold text-xl">
          Product Details
        </h2>
        <button
          onClick={() => {
             setScannerOpen(false)
            setShowProductModal(false)
            setProduct(null)
          }}
          className="text-white hover:bg-white/20 p-2 rounded-lg"
        >
          <X />
        </button>
      </div>

      {/* BODY (your existing product JSX) */}
      <div className="p-6 space-y-6">
                {/* Image */}
                {Array.isArray(product.imageUrl) && product.imageUrl.length > 0 ? (
                  <div className="relative flex justify-center">
                    <img
                      src={`${API_BASE}/${product.imageUrl[imageIndex]}`}
                      className="w-64 h-64 object-cover rounded-xl"
                    />
                    {product.imageUrl.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setImageIndex(i =>
                              i === 0 ? product.imageUrl.length - 1 : i - 1
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow"
                        >
                          <ChevronLeft />
                        </button>
                        <button
                          onClick={() =>
                            setImageIndex(i =>
                              (i + 1) % product.imageUrl.length
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow"
                        >
                          <ChevronRight />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed rounded-xl">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{product.NAME}</h3>
                  <div className="flex justify-center items-center gap-2 mt-2 text-emerald-600">
                    <DollarSign />
                    <span className="text-2xl font-bold">
                      {Number(product.SALESPRICE).toFixed(2)} AED
                    </span>
                  </div>
                </div>

                {/* Stock */}
                <div className="space-y-2">
                  {getStockInfo(product).map(s => (
                    <div
                      key={s.company}
                      className="flex justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <span>{s.company.replace(/-/g, " ")}</span>
                      <span className="font-medium">
                        <span className="text-emerald-600">net: {s.net}</span>
                        {" | "}
                        <span>gross: {s.gross}</span>
                        {" | "}
                        <span className="text-amber-600">pend: {s.pending}</span>
                      </span>
                    </div>
                  ))}
                </div>

              <div className="space-y-3">
  {/* Add to Cart */}
  <button
    onClick={() => addToCart(product._id)}
    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg"
  >
    Add to Cart
  </button>

  {/* Scan Another */}
  <button
 onClick={() => {
  setProduct(null)
  setShowProductModal(false)
  setScannerError(null)
  lastScannedRef.current = null
  setImageIndex(0)

  if (window.FlutterScanQR?.postMessage) {
    // Flutter controls camera
    window.FlutterScanQR.postMessage("open")
  } else {
    // Web controls camera
    setScannerOpen(true)
  }
}}



    className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold"
  >
    Scan Another
  </button>
</div>

              </div>
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


export default Scanner
