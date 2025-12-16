"use client"

import { useEffect, useState, useRef } from "react"
import MyAxiosInstance from "../utils/axios"
import QRBarcodeScanner from "react-qr-barcode-scanner"
import {
  X,
  Plus,
  Search,
  Package,
  Users,
  FileText,
  DollarSign,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Camera,
} from "lucide-react"

export default function AddSale() {
  const axios = MyAxiosInstance()

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

  const [scannerOpen, setScannerOpen] = useState(false)
  const [autoAdd, setAutoAdd] = useState(true)
  const [scannedProduct, setScannedProduct] = useState(null)
  const [loadingScan, setLoadingScan] = useState(false)
  const [scannerError, setScannerError] = useState(null)

  const [sale, setSale] = useState({
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    remarks: "",
    isCashSale: false,
    cashLedgerName: "",
    customerId: "",
  })

  const [loadingInventory, setLoadingInventory] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Error/Success notifications
  const [notification, setNotification] = useState(null)
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const inventorySearchRef = useRef(null)
  const customerSearchRef = useRef(null)

  // =============================
  // NOTIFICATION HANDLER
  // =============================
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const fetchProductById = async (id) => {
    try {
      setLoadingScan(true)
      setScannedProduct(null)
      setScannerError(null)

      const res = await axios.post(`/inventory/${id}`, {
        companyName,
      })

      if (res.data.ok) {
        const product = res.data.product
        setScannedProduct(product)

        if (autoAdd) {
          if (product.companyName !== companyName) {
            setScannerError({
              type: "warning",
              message: `The scanned product "${product.NAME}" belongs to ${product.companyName}, but you have selected ${companyName}. Item not added.`,
            })
            return
          }

          if (!product.disable) {
            addItem(product)
            setScannedProduct(null)
            setScannerError(null)
            showNotification("success", "Product Scanned", `${product.NAME} has been added to the sale.`)
          }
        }
      } else {
        setScannerError({
          type: "error",
          message: "Product not found",
        })
      }
    } catch (error) {
      setScannerError({
        type: "error",
        message: error.response?.data?.message || "Failed to fetch product",
      })
    } finally {
      setLoadingScan(false)
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
    setSelectedItems([])
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

  // =============================
  // ADD ITEM
  // =============================
  const addItem = (item) => {
    if (selectedItems.find((i) => i.itemId === item._id)) {
      showNotification(
        "warning",
        "Item already added",
        `${item.NAME} is already in the list. You can update its quantity.`,
      )
      return
    }

    // Parse unit from UNITS field (e.g., "Doz of 12 P" -> "Doz")
    let unitDisplay = "pcs"
    if (item.UNITS) {
      const unitMatch = item.UNITS.split(" of ")[0]
      unitDisplay = unitMatch || "pcs"
    }

    const extractPiecesPerUnit = (unitsString) => {
      if (!unitsString) return 1
      const match = unitsString.match(/of (\d+)/)
      return match ? Number.parseInt(match[1]) : 1
    }

    const piecesPerUnit = extractPiecesPerUnit(item.UNITS)

    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item._id,
        name: item.NAME,
        stock: item.closingQtyPieces || 0,
        stockFormatted: item.CLOSINGQTY || "0",
        unit: unitDisplay,
        piecesPerUnit: piecesPerUnit, // Store pieces per unit for validation
        qty: 1,
        rate: Number(item.SALESPRICE) || 0,
        rateOfTax: 5,
        amount: Number(item.SALESPRICE) || 0,
      },
    ])

    setInventorySearch("")
    setInventory([])
    setShowInventoryDropdown(false)
    showNotification("success", "Item added", `${item.NAME} has been added to the sale.`)
  }

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems]
    const numValue = Number(value) || 0

    // Validate quantity doesn't exceed available stock
    if (field === "qty") {
      const item = updated[index]
      const qtyInPieces = numValue * (item.piecesPerUnit || 1)
      const maxQtyInUnits = Math.floor(item.stock / (item.piecesPerUnit || 1))

      if (qtyInPieces > item.stock) {
        showNotification(
          "error",
          "Insufficient Stock",
          `Cannot add ${numValue} ${item.unit} (${qtyInPieces} pcs). Only ${maxQtyInUnits} ${item.unit} (${item.stock} pcs) available for ${item.name}.`,
        )
        updated[index][field] = maxQtyInUnits
        updated[index].amount = maxQtyInUnits * updated[index].rate
        setSelectedItems(updated)
        return
      }
      if (numValue <= 0) {
        showNotification("warning", "Invalid Quantity", `Quantity must be at least 1.`)
        return
      }
    }

    updated[index][field] = numValue
    updated[index].amount = updated[index].qty * updated[index].rate
    setSelectedItems(updated)
  }

  const removeItem = (index) => {
    const itemName = selectedItems[index].name
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
    showNotification("info", "Item removed", `${itemName} has been removed from the sale.`)
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
  const validateSale = () => {
    if (!sale.billNo.trim()) {
      showNotification("error", "Validation Error", "Bill number is required. Please enter a valid bill number.")
      return false
    }

    if (!sale.isCashSale && !sale.customerId) {
      showNotification("error", "Validation Error", "Please select a customer for credit sale or enable cash sale.")
      return false
    }

    if (sale.isCashSale && !sale.cashLedgerName.trim()) {
      showNotification("error", "Validation Error", "Cash ledger name is required for cash sales.")
      return false
    }

    if (!validateItems()) {
      return false
    }

    return true
  }

  const validateItems = () => {
    if (selectedItems.length === 0) {
      showNotification("warning", "No Items", "Please add at least one item to the sale.")
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
  // SUBMIT SALE
  // =============================
  const submitSale = async () => {
    if (!validateSale()) return

    const payload = {
      companyName,
      billNo: sale.billNo,
      date: sale.date,
      reference: sale.reference,
      remarks: sale.remarks,
      isCashSale: sale.isCashSale,
      cashLedgerName: sale.cashLedgerName,
      customerId: sale.customerId || null,
      items: selectedItems.map((i) => ({
        itemId: i.itemId,
        qty: i.qty,
        rate: i.rate,
        rateOfTax: includeVAT ? i.rateOfTax : 0,
      })),
    }

    setSubmitting(true)
    try {
      await axios.post("/add-sale", payload)
      showNotification("success", "Sale Created Successfully", `Bill #${sale.billNo} has been saved successfully.`)

      // Reset form after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred while saving the sale."
      const errorDetails = error.response?.data?.details || ""

      showNotification(
        "error",
        "Failed to Create Sale",
        `${errorMessage}${errorDetails ? ` Details: ${errorDetails}` : ""}`,
      )
    } finally {
      setSubmitting(false)
    }
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
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Create New Sale
              </h1>
              <p className="text-gray-500 mt-1">Enter sale details and add items to the invoice</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">Company:</span>
              <div className="flex gap-2">
                {["AMANA-FIRST-TRADING-LLC", "FANCY-PALACE-TRADING-LLC"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCompanyName(c)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      companyName === c
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {c === "AMANA-FIRST-TRADING-LLC" ? "AMANA-FIRST-TRADING-LLC" : "FANCY-PALACE-TRADING-LLC"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SALE DETAILS */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Sale Information
          </h2>

          {/* Bill Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter bill number"
              value={sale.billNo}
              onChange={(e) => setSale({ ...sale, billNo: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Date */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={sale.date}
              onChange={(e) => setSale({ ...sale, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Reference */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
            <input
              type="text"
              placeholder="Enter reference"
              value={sale.reference}
              onChange={(e) => setSale({ ...sale, reference: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Remarks */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea
              rows="4"
              placeholder="Enter remarks"
              value={sale.remarks}
              onChange={(e) => setSale({ ...sale, remarks: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Cash Sale Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700">Cash Sale</label>
            <input
              type="checkbox"
              checked={sale.isCashSale}
              onChange={(e) => setSale({ ...sale, isCashSale: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* CASH LEDGER */}
        {sale.isCashSale && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Cash Ledger Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Ledger Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter cash ledger name"
                value={sale.cashLedgerName}
                onChange={(e) => setSale({ ...sale, cashLedgerName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* INVENTORY SEARCH */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Add Items to Sale
            </h2>
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Scan QR Code
            </button>
          </div>

          <div className="relative" ref={inventorySearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Inventory</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Type to search inventory items..."
                value={inventorySearch}
                onChange={(e) => {
                  setInventorySearch(e.target.value)
                  if (e.target.value.trim()) {
                    fetchInventory()
                  } else {
                    setInventory([])
                    setShowInventoryDropdown(false)
                  }
                }}
                onFocus={() => inventorySearch && setShowInventoryDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Inventory Dropdown */}
            {showInventoryDropdown && (
              <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {inventory.map((item) => (
                  <div
                    key={item._id}
                    className="px-4 py-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      addItem(item)
                      setInventorySearch("")
                      setShowInventoryDropdown(false)
                    }}
                  >
                    <h3 className="text-gray-800 font-semibold text-sm mb-1">{item.NAME}</h3>
                    <p className="text-gray-600 text-xs">
                      Price: AED {Number(item.SALESPRICE).toFixed(2)}
                      <span className="ml-2">Stock: {item.CLOSINGQTY || "0"}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CUSTOMER SEARCH */}
          <div className="relative mt-6" ref={customerSearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Customer</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Type to search customers..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  if (e.target.value.trim()) {
                    fetchCustomers()
                  } else {
                    setCustomers([])
                    setShowCustomerDropdown(false)
                  }
                }}
                onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                {customers.map((customer) => (
                  <div
                    key={customer._id}
                    className="px-4 py-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSale({ ...sale, customerId: customer._id })
                      setCustomerSearch("")
                      setShowCustomerDropdown(false)
                    }}
                  >
                    <h3 className="text-gray-800 font-semibold text-sm mb-1">{customer.name}</h3>
                    <p className="text-gray-600 text-xs">
                      Address: {customer.address || "N/A"}
                      <span className="ml-2">TRN: {customer.trn || "N/A"}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SELECTED ITEMS */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Selected Items
          </h2>

          <div className="space-y-4">
            {selectedItems.map((item, index) => (
              <div key={item.itemId} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-gray-800 font-semibold text-sm">{item.name}</h3>
                  <p className="text-gray-600 text-xs">
                    Price: AED {item.rate.toFixed(2)}
                    <span className="ml-2">Unit: {item.unit}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                    className="w-16 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(index, "rate", e.target.value)}
                    className="w-24 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <span className="text-gray-800 font-semibold text-sm">AED {item.amount.toFixed(2)}</span>
                  <button
                    onClick={() => removeItem(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            disabled={submitting}
          >
            Reset Form
          </button>
          <button
            onClick={submitSale}
            disabled={submitting || selectedItems.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Camera className="w-6 h-6" />
                Scan Product QR Code
              </h2>
              <button
                onClick={() => {
                  setScannerOpen(false)
                  setScannedProduct(null)
                  setScannerError(null)
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
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
                    if (data?.text) fetchProductById(data.text.trim())
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

              {scannedProduct && !autoAdd && (
                <div className="mt-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  {scannedProduct.productImage && (
                    <div className="mb-3 flex justify-center">
                      <img
                        src={scannedProduct.productImage || "/placeholder.svg"}
                        alt={scannedProduct.NAME}
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{scannedProduct.NAME}</h3>
                  {scannedProduct.SALESPRICE && (
                    <p className="text-blue-700 font-semibold text-xl mb-3">
                      AED {Number(scannedProduct.SALESPRICE).toFixed(2)}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mb-3">
                    Stock: {scannedProduct.CLOSINGQTY || "0"}
                    {scannedProduct.closingQtyPieces !== undefined && (
                      <span className="text-xs text-gray-500 ml-1">({scannedProduct.closingQtyPieces} pcs)</span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      addItem(scannedProduct)
                      setScannedProduct(null)
                      setScannerOpen(false)
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Sale
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPANY SELECTION MODAL */}
      {!companyName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/60 via-blue-900/60 to-indigo-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white">Select Company</h2>
              <p className="text-blue-100 mt-1">Please select a company to proceed with the sale.</p>
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
    </div>
  )
}
