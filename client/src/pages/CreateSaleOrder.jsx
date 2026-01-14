"use client"

import { useEffect, useState, useRef } from "react"
import QRBarcodeScanner from "react-qr-barcode-scanner"
import MyAxiosInstance from "../utils/axios"
import {
  X,
  Plus,
  Search,
  Package,
  ImageIcon,
  Users,
  Calendar,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  QrCode,
   ChevronLeft,
  Layers,
  ShoppingCart,
  CheckCircle2,
  DollarSign,
  ChevronRight
} from "lucide-react"
import { API_BASE } from "../utils/url"
export default function CreateSaleOrder() {
  const axios = MyAxiosInstance()
const lastScannedRef = useRef(null)
const inventoryDebounceRef = useRef(null)

const [isFlutterApp, setIsFlutterApp] = useState(false)
useEffect(() => {
  if (typeof window !== "undefined") {
    setIsFlutterApp(!!window.FlutterScanQR)
  }
  console.log("Environment:", window.FlutterScanQR ? "Flutter" : "Browser")
}, [])



  // =============================
  // STATE
  // =============================
  const [companyName, setCompanyName] = useState("")
  const [inventory, setInventory] = useState([])
  const [customers, setCustomers] = useState([])
  const [inventorySearch, setInventorySearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedItems, setSelectedItems] = useState([])
  const [includeVAT, setIncludeVAT] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)


  const [hydrating, setHydrating] = useState(false)
const [pendingSaleOrderIds, setPendingSaleOrderIds] = useState(null)
const [showCartDecision, setShowCartDecision] = useState(false)


  const [saleOrder, setSaleOrder] = useState({
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    remarks: "",
    partyName: "",
  })

  const [loadingInventory, setLoadingInventory] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false)
  const [autoAdd, setAutoAdd] = useState(false)
  const [scannedProduct, setScannedProduct] = useState(null)
  const [loadingScan, setLoadingScan] = useState(false)
  const [scannerError, setScannerError] = useState(null)

  const inventorySearchRef = useRef(null)
  const customerSearchRef = useRef(null)

  // =============================
  // NOTIFICATION HANDLER
  // =============================
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // =============================
  // HELPER FUNCTIONS
  // =============================


  function getCompanyStockInfo(item) {
  return Object.keys(item)
    .filter((key) => {
      const lowerKey = key.toLowerCase();

      // ✅ keep only real stock keys
      return (
        key.endsWith("Stock") &&
        !lowerKey.includes("isoutof")
      );
    })
    .map((stockKey) => {
      const company = stockKey.replace("Stock", "");

      return {
        company,
        gross: item[`${company}Stock`] || "-",
        net: item[`${company}-NetAvailable`] || "-",
        pending: item[`${company}-UnsyncedQty`] ?? 0,
        unit: item[`${company}Unit`] || "",
      };
    });
}

//  function getCompanyStockInfo(item) {
//   return Object.keys(item)
//     .filter(
//       (key) =>
//         key.endsWith("Stock") && key !== "isOutOfStock"
//     )
//     .map((stockKey) => {
//       const company = stockKey.replace("Stock", "");
//       return {
//         company,
//         stock: Number(item[stockKey]) || 0,
//         unit: item[`${company}Unit`] || ""
//       };
//     })
//     .filter((s) => s.stock > 0);
// }


  const normalizeUnit = (units = "") => {
    if (!units) return { display: "pcs", multiplier: 1 }

    const u = units.toLowerCase()

    if (u.includes("doz")) return { display: "Doz", multiplier: 12 }
    if (u.includes("gross")) return { display: "Gross", multiplier: 144 }
    if (u.includes("pair")) return { display: "Pair", multiplier: 2 }

    return { display: "pcs", multiplier: 1 }
  }

  const openScanner = () => {
  setScannerError(null)

  if (window.FlutterScanQR?.postMessage) {
    window.FlutterScanQR.postMessage("open")
  } else {
    setScannerOpen(true)
  }
}

const closeScanner = () => {
  setScannerError(null)

  if (window.FlutterScanQR?.postMessage) {
    window.FlutterScanQR.postMessage("close")
  } else {
    setScannerOpen(false)
  }
}


  // =============================
  // FETCH INVENTORY
  // =============================
  const fetchInventory = async () => {
    if (!inventorySearch.trim()) {
      setInventory([])
      return
    }

    setLoadingInventory(true)
    try {
      const res = await axios.get("/inventory", {
        params: {
          companyName,
          getRaw:true,
          search: inventorySearch,
          page: 1,
          limit: 50,
          includeOutOfStock: false,
        },
      })
      setInventory(res.data.items || [])
      setShowInventoryDropdown(true)
    } catch (error) {
      showNotification(
        "error",
        "Failed to load inventory",
        error.response?.data?.message || "Unable to fetch inventory items. Please try again.",
      )
      setInventory([])
    } finally {
      setLoadingInventory(false)
    }
  }

  // =============================
  // FETCH CUSTOMERS
  // =============================
  const fetchCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const res = await axios.get("/customers", {
        params: {
          companyName,
          search: customerSearch,
          page: 1,
          limit: 50,
        },
      })
      setCustomers(res.data.items || res.data.customers || [])
      if (customerSearch) {
        setShowCustomerDropdown(true)
      }
    } catch (error) {
      showNotification(
        "error",
        "Failed to load customers",
        error.response?.data?.message || "Unable to fetch customers. Please try again.",
      )
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    // setSelectedItems([])
  }, [companyName])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inventorySearchRef.current && !inventorySearchRef.current.contains(event.target)) {
        setShowInventoryDropdown(false)
      }
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
  if (!isFlutterApp) return

  window.onFlutterQrScanned = (code) => {
    if (!code) return
    handleScanResult(code)
  }

  return () => {
    delete window.onFlutterQrScanned
  }
}, [companyName, isFlutterApp])



  // =============================
  // FETCH PRODUCT BY QR
  // =============================
  const fetchProductById = async (id) => {
  try {
    const res = await axios.post(`/inventory/${id}`, { companyName })

    if (!res.data.ok) {
      setScannerError({ type: "error", message: "Product not found" })
      return null
    }
console.log(res.data)
    return res.data.product
  } catch (err) {
    setScannerError({
      type: "error",
      message: "Unable to find the scanned product. Please try again.",
    })
    return null
  }
}

const hydrateSaleOrderItems = async (ids, detectedCompany) => {
  setHydrating(true)

  try {
    setCompanyName(detectedCompany)

    const fetchedItems = []

    for (const id of ids) {
      const product = await fetchProductById(id)
      if (!product) continue

      const { display: unit, multiplier: piecesPerUnit } =
        normalizeUnit(product.UNITS)

      fetchedItems.push({
        ...product,

        itemId: product._id,
        name: product.NAME,

        unit,
        piecesPerUnit,

        qty: 1,
        rate: Number(product.SALESPRICE) || 0,
        rateOfTax: 5,
        amount: Number(product.SALESPRICE) || 0,
      })
    }

    setSelectedItems(fetchedItems)
  } finally {
    setHydrating(false)
  }
}



const loadSaleOrderFromStorage = async () => {
  // 1️⃣ Decide source
  const fancyIds = JSON.parse(localStorage.getItem("fancy-sale-order") || "[]")
  const amanaIds = JSON.parse(localStorage.getItem("amana-sale-order") || "[]")

  let ids = []
  let detectedCompany = ""

  if (fancyIds.length > 0) {
    ids = fancyIds
    detectedCompany = "FANCY-PALACE-TRADING-LLC"
  } else if (amanaIds.length > 0) {
    ids = amanaIds
    detectedCompany = "AMANA-FIRST-TRADING-LLC"
  } else {
    return // nothing to load
  }

  // 2️⃣ Set company FIRST
  setCompanyName(detectedCompany)

  try {
    // 3️⃣ Fetch products in bulk
    const res = await axios.post("/inventoryBulk", {
      ids,
    })

    const products = res.data.items || []

    // 4️⃣ Add items exactly like manual add
    const itemsToAdd = products.map((item) => {
      const { display: unit, multiplier: piecesPerUnit } = normalizeUnit(item.UNITS)

      return {
        ...item,

        itemId: item._id,
        name: item.NAME,

        unit,
        piecesPerUnit,

        qty: 1,
        rate: Number(item.SALESPRICE) || 0,
        rateOfTax: 5,
        amount: Number(item.SALESPRICE) || 0,
      }
    })

    setSelectedItems(itemsToAdd)
showNotification(
  "info",
  "Sale Order Loaded",
  "Items loaded from cart successfully."
)
    // 5️⃣ Cleanup storage (IMPORTANT)
    localStorage.removeItem("fancy-sale-order")
    localStorage.removeItem("amana-sale-order")
  } catch (err) {
    console.error("Failed to load sale order from storage", err)
  }
}


const handleScanResult = async (code) => {
  if (!code) return
  if (loadingScan) return

  if (!companyName) {
    showNotification(
      "warning",
      "Select Company",
      "Please select a company before scanning."
    )
    return
  }

  const trimmedCode = code.trim()

  if (lastScannedRef.current === trimmedCode) return
  lastScannedRef.current = trimmedCode

  try {
    setLoadingScan(true)
    setScannerError(null)

    const product = await fetchProductById(trimmedCode)
    if (!product) return

    if (product.companyName !== companyName) {
      showNotification(
        "warning",
        "Company Mismatch",
        `This product belongs to ${product.companyName}`
      )
      return
    }

    // AUTO ADD MODE (same as AddSale)
    if (autoAdd) {
      addItem(product)
      showNotification(
        "success",
        "Product Added",
        `${product.NAME} added successfully`
      )
      lastScannedRef.current = null
      return
    }

    // ✅ MANUAL MODE (KEY FIX)
    setScannedProduct(product)

  } catch (err) {
    showNotification(
      "error",
      "Scan Failed",
      "Unable to process scanned product."
    )
  } finally {
    setLoadingScan(false)
  }
}


const resetSaleOrderForm = () => {
  setSaleOrder({
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    remarks: "",
    partyName: "",
  })
  setSelectedItems([])
  setInventory([])
  setInventorySearch("")
  setCustomerSearch("")
  setNotification(null)
}


  // =============================
  // ADD ITEM
  // =============================
const addItem = (item,qtyValue) => {
  if (selectedItems.find((i) => i.itemId === item._id)) {
    showNotification(
      "warning",
      "Item already added",
      `${item.NAME} is already in the list.`
    )
    return
  }

  const { display: unit, multiplier: piecesPerUnit } = normalizeUnit(item.UNITS)

  setSelectedItems((prev) => [
    ...prev,
    {
      ...item, // 🔥 KEEP ALL COMPANY-WISE STOCK FIELDS

      itemId: item._id,
      name: item.NAME,

      unit,
      piecesPerUnit,

      qty: item.qty || 1,
      rate: item?.qty ? Number(item.qty)* Number(item.SALESPRICE) : Number(item.SALESPRICE)  || 0,
      rateOfTax: 5,
      amount: Number(item.SALESPRICE) || 0,
    },
  ])

  setInventorySearch("")
  setInventory([])
  setShowInventoryDropdown(false)

  showNotification(
    "success",
    "Item added",
    `${item.NAME} has been added to the sale order.`
  )
}


const updateItem = (index, field, value) => {
  const updated = [...selectedItems]

  // Allow empty while typing
  if (value === "") {
    updated[index][field] = ""
    setSelectedItems(updated)
    return
  }

  const numValue = Number(value)

  if (field === "qty" && numValue < 1) {
    showNotification("warning", "Invalid Quantity", "Quantity must be at least 1.")
    return
  }

  if (field === "rate" && numValue < 1) {
    showNotification("warning", "Invalid Rate", "Rate must be at least 1 AED.")
    return
  }

  updated[index][field] = numValue
  updated[index].amount = updated[index].qty * updated[index].rate
  setSelectedItems(updated)
}


  const removeItem = (index) => {
    const itemName = selectedItems[index].name
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
    showNotification("info", "Item removed", `${itemName} has been removed from the sale order.`)
  }

  // =============================
  // TOTALS
  // =============================
  const subtotal = selectedItems.reduce((s, i) => s + i.amount, 0)
  const vatAmount = includeVAT ? selectedItems.reduce((s, i) => s + (i.amount * i.rateOfTax) / 100, 0) : 0
  const total = subtotal + vatAmount

  // =============================
  // VALIDATION
  // =============================
  const validateSaleOrder = () => {
    if (!saleOrder.billNo.trim()) {
      showNotification("error", "Validation Error", "Bill number is required. Please enter a valid bill number.")
      return false
    }

    if (selectedItems.length === 0) {
      showNotification("warning", "No Items", "Please add at least one item to the sale order.")
      return false
    }

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      if (item.qty <= 0) {
        showNotification(
          "error",
          "Validation Error",
          `Invalid quantity for ${item.name}. Quantity must be greater than 0.`,
        )
        return false
      }
      const qtyInPieces = item.qty * (item.piecesPerUnit || 1)
      const maxQtyInUnits = Math.floor(item.stock / (item.piecesPerUnit || 1))

      if (qtyInPieces > item.stock) {
        showNotification(
          "error",
          "Stock Exceeded",
          `Cannot sell ${item.qty} ${item.unit} (${qtyInPieces} pcs) of ${item.name}. Only ${maxQtyInUnits} ${item.unit} (${item.stock} pcs) available in stock.`,
        )
        return false
      }
      if (item.rate < 0) {
        showNotification("error", "Validation Error", `Invalid rate for ${item.name}. Rate cannot be negative.`)
        return false
      }
    }

    return true
  }

  // =============================
  // SUBMIT SALE ORDER
  // =============================
  const submitSaleOrder = async () => {
    if (!validateSaleOrder()) return

    const payload = {
      companyName,
      billNo: saleOrder.billNo,
      date: saleOrder.date,
      remarks: saleOrder.remarks,
      partyName: saleOrder.partyName || "",
      items: selectedItems.map((i) => ({
        itemName: i.name,
        qty: i.qty,
        unit: i.unit,
        rate: i.rate,
        amount: i.amount,
        rateOfTax: includeVAT ? i.rateOfTax : 0,
      })),
      totalAmount: total,
    }

    setSubmitting(true)
    try {
      await axios.post("/sale-orders", payload)
      showNotification(
        "success",
        "Sale Order Created Successfully",
        `Sale Order #${saleOrder.billNo} has been saved successfully.`,
      )

      // Reset form after 2 seconds
     setTimeout(() => {
  resetSaleOrderForm()
}, 1500)
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred while saving the sale order."
      const errorDetails = error.response?.data?.details || ""

      showNotification(
        "error",
        "Failed to Create Sale Order",
        `${errorMessage}${errorDetails ? ` Details: ${errorDetails}` : ""}`,
      )
    } finally {
      setSubmitting(false)
    }
  }
useEffect(() => {
  loadSaleOrderFromStorage()
}, [])
useEffect(() => {
  const fancyIds = JSON.parse(localStorage.getItem("fancy-sale-order") || "[]")
  const amanaIds = JSON.parse(localStorage.getItem("amana-sale-order") || "[]")

  if (fancyIds.length > 0) {
    setPendingSaleOrderIds({
      ids: fancyIds,
      company: "FANCY-PALACE-TRADING-LLC",
      key: "fancy-sale-order",
    })
    setShowCartDecision(true)
  } else if (amanaIds.length > 0) {
    setPendingSaleOrderIds({
      ids: amanaIds,
      company: "AMANA-FIRST-TRADING-LLC",
      key: "amana-sale-order",
    })
    setShowCartDecision(true)
  }
}, [])


const handleKeepCartItems = () => {
  if (!pendingSaleOrderIds) return

  const { ids, company } = pendingSaleOrderIds

  // restore cart
  const existingCart =
    JSON.parse(localStorage.getItem("cartItems") || "[]")

  const merged = Array.from(new Set([...existingCart, ...ids]))

  localStorage.setItem("cartItems", JSON.stringify(merged))

  hydrateSaleOrderItems(ids, company)

  localStorage.removeItem("fancy-sale-order")
  localStorage.removeItem("amana-sale-order")

  setShowCartDecision(false)
}

const handleRemoveCartItems = () => {
  if (!pendingSaleOrderIds) return

  hydrateSaleOrderItems(
    pendingSaleOrderIds.ids,
    pendingSaleOrderIds.company
  )

  localStorage.removeItem("fancy-sale-order")
  localStorage.removeItem("amana-sale-order")

  setShowCartDecision(false)
}




  // =============================
  // RENDER
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* NOTIFICATION */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-2xl border-l-4 ${
              notification.type === "success"
                ? "border-green-500"
                : notification.type === "error"
                  ? "border-red-500"
                  : notification.type === "warning"
                    ? "border-yellow-500"
                    : "border-blue-500"
            } p-4 animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {notification.type === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {notification.type === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                {notification.type === "warning" && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                {notification.type === "info" && <AlertCircle className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
       <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    
    {/* Title Section */}
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Create Sale Order
      </h1>
      <p className="text-sm sm:text-base text-gray-500 mt-1">
        Enter sale order details and add items
      </p>
    </div>

    {/* Company Selector */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span className="text-sm text-gray-500 font-medium">
        Company:
      </span>

      <div className="flex flex-col sm:flex-row gap-2">
        {["AMANA-FIRST-TRADING-LLC", "FANCY-PALACE-TRADING-LLC"].map((c) => (
          <button
            key={c}
            onClick={() => setCompanyName(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all w-full sm:w-auto ${
              companyName === c
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {c === "AMANA-FIRST-TRADING-LLC"
              ? "AMANA-FIRST-TRADING-LLC"
              : "FANCY-PALACE-TRADING-LLC"}
          </button>
        ))}
      </div>
    </div>

  </div>
</div>


        {/* SALE ORDER DETAILS */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Sale Order Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter bill number"
                value={saleOrder.billNo}
                onChange={(e) => setSaleOrder({ ...saleOrder, billNo: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={saleOrder.date}
                onChange={(e) => setSaleOrder({ ...saleOrder, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <input
                type="text"
                placeholder="Optional remarks"
                value={saleOrder.remarks}
                onChange={(e) => setSaleOrder({ ...saleOrder, remarks: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* CUSTOMER SELECTION */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Customer Details
          </h2>

          <div className="relative" ref={customerSearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Customer (Optional)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Type to search customers..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  fetchCustomers()
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {showCustomerDropdown && customers.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => {
                      setSaleOrder({ ...saleOrder, partyName: customer.name })
                      setCustomerSearch(customer.name)
                      setShowCustomerDropdown(false)
                    }}
                    className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                      saleOrder.partyName === customer.name ? "bg-blue-100" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-800">{customer.name}</div>
                    {customer.contact && <div className="text-sm text-gray-500">{customer.contact}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {saleOrder.partyName && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Customer: {saleOrder.partyName}</span>
              </div>
            </div>
          )}
        </div>
<div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-5 py-4 shadow-sm hover:shadow-md transition-all">
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative">
      <input
        type="checkbox"
        checked={autoAdd}
        onChange={() => setAutoAdd(!autoAdd)}
        className="peer w-5 h-5 cursor-pointer rounded-md border-2 border-slate-300 checked:bg-gradient-to-br checked:from-emerald-600 checked:to-emerald-700 checked:border-emerald-600 transition-all appearance-none checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:font-bold hover:border-slate-400"
      />
    </div>
    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors select-none">
      Auto add scanned item
    </span>
  </label>
</div>
        {/* INVENTORY SEARCH */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Add Items to Sale Order
          </h2>

          <div className="relative" ref={inventorySearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Inventory</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type to search inventory items..."
                  value={inventorySearch}
                onChange={(e) => {
  const value = e.target.value
  setInventorySearch(value)

  if (inventoryDebounceRef.current) {
    clearTimeout(inventoryDebounceRef.current)
  }

  inventoryDebounceRef.current = setTimeout(() => {
    if (value.trim()) {
      fetchInventory()
    } else {
      setInventory([])
      setShowInventoryDropdown(false)
    }
  }, 300)
}}

                  onFocus={() => inventorySearch && setShowInventoryDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button
onClick={() => {
  openScanner()
}}
           className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center gap-2 font-medium"
              >
                <QrCode className="w-5 h-5" />
                Scan QR
              </button>
            </div>

            {showInventoryDropdown && inventory.length > 0 && (
             <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 h-56 overflow-auto">
          {inventory.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-500 text-sm">No items to display</div>
          ) : (
            inventory.map((item) => (
              <div
                key={item._id}
                className="group px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
                onClick={() => {
                  addItem(item)
                  setInventorySearch("")
                  setShowInventoryDropdown(false)
                }}
              >
                {/* Item name and price */}
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-900">{item.NAME}</h3>
                  <span className="text-sm font-semibold text-neutral-700">
                    AED {Number(item.SALESPRICE).toFixed(2)}
                  </span>
                </div>

               {/* Stock breakdown */}
                <div className="space-y-1.5">
             {getCompanyStockInfo(item).map((s) => (
  <div
    key={s.company}
    className="flex items-center justify-between text-xs"
  >
    <span className="text-neutral-500 font-normal tracking-wide uppercase text-[10px]">
      {s.company.replace(/-/g, " ")}
    </span>

    <span className="font-medium text-neutral-800 tabular-nums">
      <span className="text-emerald-600">
        net: {s.net}
      </span>
      {" | "}
      <span className="text-neutral-700">
        gross: {s.gross}
      </span>
      {" | "}
      <span className="text-amber-600">
        pend: {s.pending}
      </span>
    </span>
  </div>
))}



                  {/* Total stock */}
                  {getCompanyStockInfo(item).length > 1 && (
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Total</span>
                      <span className="text-sm font-bold text-neutral-900 tabular-nums">
                        {getCompanyStockInfo(item).reduce((sum, s) => sum + (s.stock || 0), 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
            )}

            {loadingInventory && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
                Loading inventory...
              </div>
            )}
          </div>
        </div>

        {/* SELECTED ITEMS */}
        { (
          <>
          {/* ===================== */}
{/* 1. SELECTED ITEMS */}
{/* ===================== */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
  <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
    <Package className="w-5 h-5 text-blue-600" />
    Selected Items ({selectedItems.length})
  </h2>

  <div className="space-y-6">
    {selectedItems.map((item, index) => (
      <div
        key={index}
        className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0"
      >
        {/* ITEM INFO */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-semibold text-sm mb-2">
            {item.name}
          </h3>

          <div className="text-xs text-gray-500 mb-3">
            <span className="font-medium text-gray-600">Unit:</span>{" "}
            {item.unit}
          </div>

          {/* Company-wise stock */}
          <div className="space-y-1">
            {getCompanyStockInfo(item).map((s) => (
              <div
                key={s.company}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-gray-500 uppercase tracking-wide">
                  {s.company.replace(/-/g, " ")}
                </span>

                <span className="font-medium text-gray-800 tabular-nums">
                  <span className="text-emerald-600">net: {s.net}</span>
                  {" | "}
                  <span className="text-gray-700">gross: {s.gross}</span>
                  {" | "}
                  <span className="text-amber-600">pend: {s.pending}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-end gap-3">
          {/* QTY */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={item.qty}
              onChange={(e) => updateItem(index, "qty", e.target.value)}
               onBlur={() => {
    if (!item.qty || item.qty < 1) {
      updateItem(index, "qty", 1)
    }
  }}
              className="w-20 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-center
                focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* RATE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Rate (AED)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={item.rate}
              onChange={(e) => updateItem(index, "rate", e.target.value)}
               onBlur={() => {
    if (!item.rate || item.rate < 1) {
      updateItem(index, "rate", 1)
    }
  }}
              className="w-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-center
                focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* TAX */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Tax %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={item.rateOfTax}
              onChange={(e) => updateItem(index, "rateOfTax", e.target.value)}
              disabled={!includeVAT}
              className="w-20 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-center
                focus:ring-2 focus:ring-blue-500 outline-none
                disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* AMOUNT */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Amount (AED)
            </label>
            <div className="w-28 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm font-bold text-gray-900 block text-center">
                {item.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* REMOVE */}
          <button
            onClick={() => removeItem(index)}
            className="px-3 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

{/* ===================== */}
{/* 2. VAT TOGGLE */}
{/* ===================== */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-gray-900">VAT (5%)</h3>
      <p className="text-xs text-gray-500 mt-1">
        Enable or disable VAT calculation
      </p>
    </div>

    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={includeVAT}
        onChange={() => setIncludeVAT(!includeVAT)}
        className="sr-only peer"
      />
      <div className="w-12 h-6 bg-gray-200 rounded-full peer-checked:bg-emerald-500 transition-all"></div>
      <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow"></span>
    </label>
  </div>
</div>

{/* ===================== */}
{/* 3. TOTALS */}
{/* ===================== */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
  <div className="space-y-4">
    <div className="flex justify-between text-sm">
      <span className="text-gray-600 font-medium">Subtotal</span>
      <span className="text-gray-900 font-semibold">
        AED {subtotal.toFixed(2)}
      </span>
    </div>

    <div className="flex justify-between text-sm">
      <span className="text-gray-600 font-medium">
        VAT {includeVAT ? "(5%)" : "(Excluded)"}
      </span>
      <span className="text-gray-900 font-semibold">
        AED {vatAmount.toFixed(2)}
      </span>
    </div>

    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
      <span className="text-lg font-bold text-gray-900">Total</span>
      <span className="text-2xl font-bold text-blue-600">
        AED {total.toFixed(2)}
      </span>
    </div>
  </div>
</div>

{/* ===================== */}
{/* 4. ACTION BUTTONS */}
{/* ===================== */}
<div className="flex justify-end gap-4 mb-24">
  <button
    onClick={() => window.location.reload()}
    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
    disabled={submitting}
  >
    Reset Form
  </button>

  <button
    onClick={submitSaleOrder}
    disabled={submitting || selectedItems.length === 0}
    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold
      hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg
      disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    {submitting ? (
      <>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        Saving...
      </>
    ) : (
      <>
        <CheckCircle className="w-5 h-5" />
        Save Sale
      </>
    )}
  </button>
</div>

          </>
      

        )}

        {/* SUBMIT BUTTON */}
        {/* <div className="hidden flex justify-end gap-3 mb-24">
          <button
            onClick={submitSaleOrder}
            disabled={submitting || selectedItems.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Save Sale Order
              </>
            )}
          </button>
        </div> */}

        {/* SCANNER MODAL */}
        {scannerOpen && !isFlutterApp &&(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-blue-600" />
                    Scan Product QR Code
                  </h3>
                  <button
onClick={() => {
  closeScanner()
}}

                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <label className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    checked={autoAdd}
                    onChange={() => setAutoAdd(!autoAdd)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Automatically add scanned items</span>
                </label>

                <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                  <QRBarcodeScanner
                    onUpdate={(err, data) => {
    if (data?.text) handleScanResult(data.text)
                    }}
                    style={{ width: "100%" }}
                  />
                </div>

                {loadingScan && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">Loading product...</span>
                    </div>
                  </div>
                )}

                {scannerError && (
                  <div
                    className={`mt-4 p-4 rounded-lg border-2 ${
                      scannerError.type === "error" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {scannerError.type === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          scannerError.type === "error" ? "text-red-800" : "text-yellow-800"
                        }`}
                      >
                        {scannerError.message}
                      </p>
                    </div>
                  </div>
                )}

             
              </div>
            </div>
          </div>
        )}
      </div>
      {/* COMPANY SELECTION MODAL */}
      {!companyName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/60 via-blue-900/60 to-indigo-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white">Select Company</h2>
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AMANA */}
              <button
                onClick={() => setCompanyName("AMANA-FIRST-TRADING-LLC")}
                className="group w-full text-left p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all bg-gradient-to-br from-white to-blue-50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-600 text-white shadow-md">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                      AMANA FIRST TRADING LLC
                    </h3>
                  </div>
                </div>
              </button>

              {/* FANCY PALACE */}
              <button
                onClick={() => setCompanyName("FANCY-PALACE-TRADING-LLC")}
                className="group w-full text-left p-6 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all bg-gradient-to-br from-white to-indigo-50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-indigo-600 text-white shadow-md">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
                      FANCY PALACE TRADING LLC
                    </h3>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
              You must select a company before continuing
            </div>
          </div>
        </div>
      )}
  {scannedProduct && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-[90vw] sm:max-w-md lg:max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-2.5 sm:py-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10"></div>
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 relative z-10">
          <div className="p-1 sm:p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Scanned Product
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Image Slider */}
        <div className="relative">
          {Array.isArray(scannedProduct.imageUrl) &&
          scannedProduct.imageUrl.length > 0 &&
          typeof scannedProduct.imageUrl[0] === "string" &&
          scannedProduct.imageUrl[0].trim() !== "" ? (
            <div className="relative group">
              <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner">
                <img
                  src={
                    API_BASE +
                    "/" +
                    scannedProduct.imageUrl[
                      (typeof window !== "undefined" &&
                        window.__currentImageIndex) ||
                        0
                    ] || "/placeholder.svg"
                  }
                  alt={scannedProduct.NAME}
                  className="w-32 h-32 sm:w-40 sm:h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Image Navigation */}
              {scannedProduct.imageUrl.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const current =
                        (typeof window !== "undefined" &&
                          window.__currentImageIndex) ||
                        0;
                      window.__currentImageIndex =
                        current === 0
                          ? scannedProduct.imageUrl.length - 1
                          : current - 1;
                      setScannedProduct({ ...scannedProduct });
                    }}
                    className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 p-1 sm:p-1.5 rounded-full shadow-lg transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 border border-slate-200"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-slate-700" />
                  </button>

                  <button
                    onClick={() => {
                      const current =
                        (typeof window !== "undefined" &&
                          window.__currentImageIndex) ||
                        0;
                      window.__currentImageIndex =
                        (current + 1) % scannedProduct.imageUrl.length;
                      setScannedProduct({ ...scannedProduct });
                    }}
                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 p-1 sm:p-1.5 rounded-full shadow-lg transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 border border-slate-200"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-700" />
                  </button>

                  {/* Image Indicators */}
                  <div className="flex justify-center gap-1 mt-2">
                    {scannedProduct.imageUrl.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          window.__currentImageIndex = index;
                          setScannedProduct({ ...scannedProduct });
                        }}
                        className={`h-1 rounded-full transition-all ${
                          ((typeof window !== "undefined" &&
                            window.__currentImageIndex) ||
                            0) === index
                            ? "w-6 bg-slate-700"
                            : "w-1 bg-slate-300 hover:bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
                <span className="text-slate-500 text-xs font-medium">
                  No image
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-3">
          <div className="text-center">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-tight truncate px-2">
              {scannedProduct.NAME}
            </h4>
            <div className="inline-flex items-center gap-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 border-emerald-200 shadow-sm">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-xl sm:text-2xl font-bold text-emerald-700">
                {Number(scannedProduct.SALESPRICE).toFixed(2)}
              </span>
              <span className="text-xs sm:text-sm text-emerald-600 font-semibold">AED</span>
            </div>
          </div>

          {/* Stock Information */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-slate-200 rounded-lg flex-shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              </div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">Stock Availability</p>
            </div>
            <div className="space-y-1.5">
             {getCompanyStockInfo(scannedProduct).map((s) => (
  <div
    key={s.company}
    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg text-xs shadow-sm border border-slate-100 gap-2"
  >
    <span className="text-slate-600 font-medium truncate">
      {s.company.replace(/-/g, " ")}
    </span>

    <span className="font-medium text-slate-800 tabular-nums">
      <span className="text-emerald-600">net: {s.net}</span>
      {" | "}
      <span className="text-slate-700">gross: {s.gross}</span>
      {" | "}
      <span className="text-amber-600">pend: {s.pending}</span>
    </span>
  </div>
))}

            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Primary Actions Row */}
          {/* QUICK QUANTITY SELECTOR */}
<div className="mb-2">
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
    Quantity
  </label>

  <input
    type="number"
    min="1"
    step="1"
    inputMode="numeric"
    value={scannedProduct?.qty ?? 1}
    onChange={(e) => {
      if (!scannedProduct) return

      const val = e.target.value

      // allow empty while typing
      if (val === "") {
        setScannedProduct({ ...scannedProduct, qty: "" })
        return
      }

      const num = Number(val)

      if (num < 1) {
        return
      }

      setScannedProduct({
        ...scannedProduct,
        qty: num,
      })
    }}
    onBlur={() => {
      if (!scannedProduct) return

      if (!scannedProduct.qty || scannedProduct.qty < 1) {
        setScannedProduct({
          ...scannedProduct,
          qty: 1,
        })
      }
    }}
    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-center
      focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
  />
</div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                addItem(scannedProduct);
                setScannedProduct(null);
                lastScannedRef.current = null;
                window.__currentImageIndex = 0;

                if (isFlutterApp) {
                  window.FlutterScanQR?.postMessage("open");
                } else {
                  setScannerOpen(true);
                }
              }}
              className="py-2 sm:py-2.5 px-2 sm:px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95 text-xs sm:text-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Add Item</span>
            </button>

            <button
              onClick={() => {
                addItem(scannedProduct);
                setScannedProduct(null);
                lastScannedRef.current = null;
                window.__currentImageIndex = 0;

                if (isFlutterApp) {
                  window.FlutterScanQR?.postMessage("close");
                } else {
                  setScannerOpen(false);
                }
              }}
              className="py-2 sm:py-2.5 px-2 sm:px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-95 text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Add & Close</span>
            </button>
          </div>

          {/* Cancel Button Row */}
          <button
            onClick={() => {
              setScannedProduct(null);
              lastScannedRef.current = null;
              window.__currentImageIndex = 0;

              if (isFlutterApp) {
                window.FlutterScanQR?.postMessage("open");
              } else {
                setScannerOpen(true);
              }
            }}
            className="w-full py-2 sm:py-2.5 px-2 sm:px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 active:scale-95 text-xs sm:text-sm"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}




{hydrating && (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-sm text-center">
      <div className="flex justify-center mb-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="font-semibold text-gray-800">
        Loading products…
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Fetching live stock from inventory
      </p>
    </div>
  </div>
)}


{showCartDecision && (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
        <h3 className="text-lg font-bold text-white">
          Cart Items Detected
        </h3>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-700">
          Items were moved from cart to create this sale order.
          What would you like to do with the cart?
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleKeepCartItems}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
          >
            Keep in Cart
          </button>

          <button
            onClick={handleRemoveCartItems}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
          >
            Remove from Cart
          </button>
        </div>
      </div>
    </div>
  </div>
)}



    </div>
  )
}
