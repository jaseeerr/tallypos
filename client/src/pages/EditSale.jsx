"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import {
  X,
  Plus,
  Search,
  Package,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"

export default function EditSale() {
    const {billNo} = useParams()
  
  const axios = MyAxiosInstance()

  // =============================
  // STATE
  // =============================
  const [companyName, setCompanyName] = useState("ABC")
  const [inventory, setInventory] = useState([])
  const [customers, setCustomers] = useState([])
  const [inventorySearch, setInventorySearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedItems, setSelectedItems] = useState([])
  const [includeVAT, setIncludeVAT] = useState(true)
  const [saleId, setSaleId] = useState("")
  const [loading, setLoading] = useState(true)

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


const getAvailableStockPieces = (item) => {
  const originalPieces =
    (item.originalQty || 0) * item.piecesPerUnit

  return (item.stockPieces || 0) + originalPieces
}



const enrichSaleItems = async (saleItems) => {
  const enriched = []

  for (const item of saleItems) {
    // Fetch inventory item
    const res = await axios.get("/inventory", {
      params: {
        companyName,
        search: item.itemName,
        limit: 1,
      },
    })

    const inv = res.data.items?.[0]

    // Resolve unit string (prefer sale unit, fallback to inventory)
    const unitsString = item.unit || inv?.UNITS || "pcs"

    // Extract unit name (e.g. "Doz" from "Doz of 12 P")
    const unit = unitsString.split(" of ")[0] || "pcs"

    // Extract pieces per unit (default = 1)
    const match = unitsString.match(/of (\d+)/)
    const piecesPerUnit = match ? Number(match[1]) : 1

    // Stock in pieces (CURRENT inventory)
    const stockPieces = inv?.closingQtyPieces ?? 0

    // Stock converted to unit (same as Add Sale)
    const stockUnits = Math.floor(stockPieces / piecesPerUnit)

    enriched.push({
      itemId: item._id,
      name: item.itemName,

      // 🔥 UNIT MODEL (SAME AS ADD SALE)
      unit,               // e.g. "Doz"
      piecesPerUnit,      // e.g. 12
      unitsString,        // e.g. "Doz of 12 P"

      // 🔥 QUANTITY
      qty: item.qty,
      originalQty: item.qty,

      // 🔥 PRICING
      rate: item.rate,
      rateOfTax: item.rateOfTax,
      amount: item.qty * item.rate,

      // 🔥 STOCK
      stockPieces,        // raw pcs
      stockUnits,         // converted unit stock
    })
  }

  return enriched
}


  // =============================
  // FETCH SALE DATA
  // =============================
const fetchSaleData = async () => {
  if (!billNo) {
    showNotification(
      "error",
      "Missing Bill Number",
      "No bill number provided in the URL"
    )
    setLoading(false)
    return
  }

  setLoading(true)

  try {
    const res = await axios.get(`/sale/${billNo}`)
    const saleData = res.data?.sale

    if (!saleData) {
      showNotification(
        "error",
        "Sale Not Found",
        "Could not find sale with the provided bill number"
      )
      return
    }

    // Save sale ID
    setSaleId(saleData._id)

    // Company
    setCompanyName(saleData.companyName)

    // Sale header
    setSale({
      billNo: saleData.billNo,
      date: saleData.date
        ? new Date(saleData.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      reference: saleData.reference || "",
      remarks: saleData.remarks || "",
      isCashSale: !!saleData.isCashSale,
      cashLedgerName: saleData.cashLedgerName || "",
      customerId: saleData.customerId || "",
    })

    // 🔥 ENRICH ITEMS WITH INVENTORY + ORIGINAL QTY
    if (Array.isArray(saleData.items) && saleData.items.length > 0) {
      const enrichedItems = await enrichSaleItems(saleData.items)

      setSelectedItems(enrichedItems)

      // VAT toggle based on actual items
      const hasVAT = enrichedItems.some(
        (item) => Number(item.rateOfTax) > 0
      )
      setIncludeVAT(hasVAT)
    } else {
      setSelectedItems([])
      setIncludeVAT(false)
    }

    // Customer display name
    if (!saleData.isCashSale && saleData.partyName) {
      setCustomerSearch(saleData.partyName)
    }

    showNotification(
      "success",
      "Sale Loaded",
      "Sale data loaded successfully for editing"
    )
  } catch (error) {
    showNotification(
      "error",
      "Failed to Load Sale",
      error.response?.data?.message ||
        "Unable to fetch sale data. Please try again."
    )
  } finally {
    setLoading(false)
  }
}




  useEffect(() => {
    fetchSaleData()
  }, [billNo])

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
    if (!loading) {
      fetchCustomers()
    }
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
        piecesPerUnit: piecesPerUnit,
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

    if (qtyInPieces > getAvailableStockPieces(item)) {
  showNotification(
    "error",
    "Insufficient Stock",
    `Only ${getAvailableStockPieces(item)} pcs available including original sale quantity`
  )
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

      if (qtyInPieces > getAvailableStockPieces(item)) {
  showNotification(
    "error",
    "Stock Exceeded",
    `Cannot sell ${item.qty} ${item.unit}. Available: ${getAvailableStockPieces(item)} pcs`
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
  // UPDATE SALE
  // =============================
  const updateSale = async () => {
    if (!validateSale()) return

    if (!saleId) {
      showNotification("error", "Error", "Sale ID is missing. Cannot update sale.")
      return
    }

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
      await axios.put(`/edit-sale/${saleId}`, payload)
      showNotification("success", "Sale Updated Successfully", `Bill #${sale.billNo} has been updated successfully.`)

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = "/sales" // Adjust to your sales list page
      }, 2000)
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred while updating the sale."
      const errorDetails = error.response?.data?.details || ""

      showNotification(
        "error",
        "Failed to Update Sale",
        `${errorMessage}${errorDetails ? ` Details: ${errorDetails}` : ""}`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  // =============================
  // LOADING STATE
  // =============================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Loading Sale Data...</h2>
          <p className="text-gray-500 mt-2">Please wait while we fetch the sale information</p>
        </div>
      </div>
    )
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
                Edit Sale
              </h1>
              <p className="text-gray-500 mt-1">Modify sale details and update the invoice</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">Company:</span>
              <div className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                {companyName === "ABC" ? "ABC" : "Fancy Palace"}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={sale.date}
                onChange={(e) => setSale({ ...sale, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
              <input
                type="text"
                placeholder="Optional reference"
                value={sale.reference}
                onChange={(e) => setSale({ ...sale, reference: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea
              placeholder="Optional remarks or notes"
              value={sale.remarks}
              onChange={(e) => setSale({ ...sale, remarks: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <input
              type="checkbox"
              id="cashSale"
              checked={sale.isCashSale}
              onChange={(e) => setSale({ ...sale, isCashSale: e.target.checked, customerId: "" })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="cashSale" className="text-sm font-medium text-gray-700 cursor-pointer">
              This is a cash sale
            </label>
          </div>
        </div>

        {/* CUSTOMER SELECTION */}
        {!sale.isCashSale && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Customer Details
            </h2>

            <div className="relative" ref={customerSearchRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customer <span className="text-red-500">*</span>
              </label>
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
                        setSale({ ...sale, customerId: customer._id })
                        setCustomerSearch(customer.name)
                        setShowCustomerDropdown(false)
                      }}
                      className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                        sale.customerId === customer._id ? "bg-blue-100" : ""
                      }`}
                    >
                      <div className="font-medium text-gray-800">{customer.name}</div>
                      {customer.contact && <div className="text-sm text-gray-500">{customer.contact}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sale.customerId && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Customer selected</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASH LEDGER */}
        {sale.isCashSale && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Cash Sale Details
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
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Add Items to Sale
          </h2>

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

            {showInventoryDropdown && inventory.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {inventory.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => addItem(item)}
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">{item.NAME}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Stock: {item.CLOSINGQTY || "0"}
                          {item.closingQtyPieces !== undefined && (
                            <span className="text-xs text-gray-400 ml-1">({item.closingQtyPieces} pcs)</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">AED {Number(item.SALESPRICE || 0).toFixed(2)}</div>
                        <button className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Selected Items ({selectedItems.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tax %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
  Stock: {item.stockUnits} {item.unit}
  {item.piecesPerUnit > 1 && (
    <> of {item.piecesPerUnit} P</>
  )}
  {" "}
  ({getAvailableStockPieces(item)} pcs)
</div>

                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-600">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                       <input
  type="number"
  min="1"
  step="1"
  value={item.qty}
  onChange={(e) => updateItem(idx, "qty", e.target.value)}
  className={`w-24 px-3 py-1.5 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none ${
    item.qty * (item.piecesPerUnit || 1) > getAvailableStockPieces(item)
      ? "border-red-500 bg-red-50"
      : "border-gray-300"
  }`}
/>

{item.qty * (item.piecesPerUnit || 1) > getAvailableStockPieces(item) && (
  <span className="text-xs text-red-600 font-medium">
    Exceeds stock!
  </span>
)}

                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, "rate", e.target.value)}
                          className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.rateOfTax}
                          onChange={(e) => updateItem(idx, "rateOfTax", e.target.value)}
                          disabled={!includeVAT}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-800">AED {item.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS SECTION */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-t border-gray-200">
              <div className="max-w-md ml-auto space-y-3">
                {/* VAT Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Include VAT in calculation</span>
                  <button
                    onClick={() => setIncludeVAT(!includeVAT)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includeVAT ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includeVAT ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-800">AED {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">VAT:</span>
                  <span className="font-semibold text-gray-800">
                    {includeVAT ? `AED ${vatAmount.toFixed(2)}` : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-4">
                  <span className="text-white font-bold text-lg">Total:</span>
                  <span className="text-white font-bold text-2xl">AED {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={updateSale}
            disabled={submitting || selectedItems.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Update Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
