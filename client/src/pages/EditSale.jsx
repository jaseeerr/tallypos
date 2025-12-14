"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import {
  Plus,
  Search,
  Package,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit,
  Lock,
} from "lucide-react"

export default function EditSale() {
  const axios = MyAxiosInstance()
  const { billNo } = useParams()
  const navigate = useNavigate()

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
  const [saleId, setSaleId] = useState(null)
  const [saleStatus, setSaleStatus] = useState("")
  const [isEditable, setIsEditable] = useState(false)

  const [sale, setSale] = useState({
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    remarks: "",
    isCashSale: false,
    cashLedgerName: "",
    customerId: "",
  })

  const [loadingSale, setLoadingSale] = useState(true)
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [notification, setNotification] = useState(null)
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const inventorySearchRef = useRef(null)
  const customerSearchRef = useRef(null)

  // =============================
  // FETCH SALE DATA
  // =============================
  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await axios.get(`/sale/${billNo}`)
        const saleData = res.data.sale

        setSaleId(saleData._id)
        setSaleStatus(saleData.status)
        setIsEditable(saleData.status?.toLowerCase() === "pending")
        setCompanyName(saleData.companyName)

        setSale({
          billNo: saleData.billNo,
          date: new Date(saleData.date).toISOString().slice(0, 10),
          reference: saleData.reference || "",
          remarks: saleData.remarks || "",
          isCashSale: saleData.isCashSale,
          cashLedgerName: saleData.cashLedgerName || "",
          customerId: saleData.customerId || "",
        })

        // Set customer search if not cash sale
        if (!saleData.isCashSale && saleData.partyName) {
          setCustomerSearch(saleData.partyName)
        }

        // Load items
        const items = saleData.items.map((item) => ({
          itemId: item.itemId,
          name: item.itemName,
          qty: item.qty,
          rate: item.rate,
          rateOfTax: item.rateOfTax || 0,
          amount: item.amount,
        }))
        setSelectedItems(items)

        // Check if VAT is included
        const hasVAT = saleData.items.some((item) => item.rateOfTax > 0)
        setIncludeVAT(hasVAT)
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to fetch sale details"
        const errorDetails = err.response?.data?.details || ""

        showNotification("error", "Failed to Load Sale", errorMessage, errorDetails)
      } finally {
        setLoadingSale(false)
      }
    }

    fetchSale()
  }, [billNo])

  // =============================
  // NOTIFICATION
  // =============================
  const showNotification = (type, title, message, details = "") => {
    setNotification({ type, title, message, details })
    setTimeout(() => setNotification(null), 5000)
  }

  const closeNotification = () => {
    setNotification(null)
  }

  // =============================
  // FETCH INVENTORY
  // =============================
  const fetchInventory = async () => {
    if (!inventorySearch.trim()) return

    setLoadingInventory(true)
    try {
      const res = await axios.get(`/inventory`, {
        params: {
          search: inventorySearch,
          company: companyName,
          page: 1,
          limit: 20,
          includeOutOfStock: true,
        },
      })
      setInventory(res.data.inventory || [])
      setShowInventoryDropdown(true)
    } catch (err) {
      showNotification(
        "error",
        "Failed to Load Inventory",
        err.response?.data?.message || "Could not fetch inventory items",
        err.response?.data?.details || "",
      )
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
      const res = await axios.get(`/customers`, {
        params: {
          search: customerSearch,
          company: companyName,
        },
      })
      setCustomers(res.data.customers || [])
      setShowCustomerDropdown(true)
    } catch (err) {
      showNotification(
        "error",
        "Failed to Load Customers",
        err.response?.data?.message || "Could not fetch customers",
        err.response?.data?.details || "",
      )
    } finally {
      setLoadingCustomers(false)
    }
  }

  // =============================
  // ADD ITEM
  // =============================
  const addItem = (item) => {
    const exists = selectedItems.find((i) => i.itemId === item._id)
    if (exists) {
      showNotification("error", "Duplicate Item", `${item.NAME} is already added to the sale.`)
      return
    }

    const newItem = {
      itemId: item._id,
      name: item.NAME,
      qty: 1,
      rate: Number(item.SALESPRICE || 0),
      rateOfTax: Number(item.RATEOFTAX || 0),
      amount: Number(item.SALESPRICE || 0),
    }

    setSelectedItems([...selectedItems, newItem])
    setInventorySearch("")
    setShowInventoryDropdown(false)
  }

  // =============================
  // UPDATE ITEM
  // =============================
  const updateItem = (index, field, value) => {
    const updated = [...selectedItems]
    const item = updated[index]

    if (field === "qty") {
      item.qty = Number(value) || 0
    } else if (field === "rate") {
      item.rate = Number(value) || 0
    } else if (field === "rateOfTax") {
      item.rateOfTax = Number(value) || 0
    }

    // Recalculate amount
    const baseAmount = item.qty * item.rate
    const taxAmount = includeVAT ? (baseAmount * item.rateOfTax) / 100 : 0
    item.amount = baseAmount + taxAmount

    setSelectedItems(updated)
  }

  // =============================
  // REMOVE ITEM
  // =============================
  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index))
  }

  // =============================
  // SELECT CUSTOMER
  // =============================
  const selectCustomer = (customer) => {
    setSale({ ...sale, customerId: customer._id })
    setCustomerSearch(customer.NAME)
    setShowCustomerDropdown(false)
  }

  // =============================
  // CALCULATE TOTALS
  // =============================
  const calculateTotals = () => {
    let subtotal = 0
    let vatAmount = 0

    selectedItems.forEach((item) => {
      const baseAmount = item.qty * item.rate
      subtotal += baseAmount
      if (includeVAT) {
        vatAmount += (baseAmount * item.rateOfTax) / 100
      }
    })

    const total = subtotal + vatAmount
    return { subtotal, vatAmount, total }
  }

  const totals = calculateTotals()

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

    if (selectedItems.length === 0) {
      showNotification("error", "Validation Error", "Please add at least one item to the sale.")
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
    if (!isEditable) {
      showNotification("error", "Edit Not Allowed", "This sale cannot be edited because it's not in pending status.")
      return
    }

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
      await axios.put(`/edit-sale/${saleId}`, payload)
      showNotification("success", "Sale Updated Successfully", `Bill #${sale.billNo} has been updated successfully.`)

      setTimeout(() => {
        navigate(`/sale/${sale.billNo}`)
      }, 2000)
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An unexpected error occurred while updating the sale."
      const errorDetails = error.response?.data?.details || ""

      showNotification("error", "Failed to Update Sale", errorMessage, errorDetails)
    } finally {
      setSubmitting(false)
    }
  }

  // =============================
  // HANDLE CLICK OUTSIDE
  // =============================
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

  if (loadingSale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-600 font-medium">Loading sale details...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
            <div
              className={`rounded-xl shadow-2xl border-2 overflow-hidden ${
                notification.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.type === "error" ? "bg-red-100" : "bg-green-100"
                    }`}
                  >
                    {notification.type === "error" ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold text-sm mb-1 ${
                        notification.type === "error" ? "text-red-900" : "text-green-900"
                      }`}
                    >
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${notification.type === "error" ? "text-red-700" : "text-green-700"}`}>
                      {notification.message}
                    </p>
                    {notification.details && (
                      <p
                        className={`text-xs mt-1 ${notification.type === "error" ? "text-red-600" : "text-green-600"}`}
                      >
                        {notification.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeNotification}
                    className={`flex-shrink-0 text-xl ${
                      notification.type === "error"
                        ? "text-red-400 hover:text-red-600"
                        : "text-green-400 hover:text-green-600"
                    }`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3">
            {!isEditable && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-700">
                <Lock className="w-4 h-4" />
                <span className="font-semibold text-sm">Read Only</span>
              </div>
            )}
            <div
              className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${
                saleStatus?.toLowerCase() === "synced"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : saleStatus?.toLowerCase() === "pending"
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : "bg-red-100 text-red-700 border-red-200"
              }`}
            >
              {saleStatus?.toUpperCase() || "UNKNOWN"}
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Edit className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-bold">Edit Sale</h1>
          </div>
          <p className="text-indigo-100 text-lg">Bill #{sale.billNo}</p>
          {!isEditable && (
            <div className="mt-4 bg-amber-500/20 border-2 border-amber-300/30 rounded-lg p-3">
              <p className="text-sm font-medium">
                This sale is in <span className="font-bold">{saleStatus}</span> status and cannot be edited. Only sales
                with <span className="font-bold">PENDING</span> status can be modified.
              </p>
            </div>
          )}
        </div>

        {/* VAT Toggle */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">VAT Calculation</h3>
                <p className="text-sm text-gray-500">Include or exclude VAT in item pricing</p>
              </div>
            </div>
            <button
              onClick={() => setIncludeVAT(!includeVAT)}
              disabled={!isEditable}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                includeVAT ? "bg-green-500" : "bg-gray-300"
              } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  includeVAT ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* SALE INFORMATION */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
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
                disabled={!isEditable}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                disabled={!isEditable}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
              <input
                type="text"
                placeholder="Optional reference"
                value={sale.reference}
                onChange={(e) => setSale({ ...sale, reference: e.target.value })}
                disabled={!isEditable}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={!isEditable}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <input
              type="checkbox"
              id="cashSale"
              checked={sale.isCashSale}
              onChange={(e) => setSale({ ...sale, isCashSale: e.target.checked, customerId: "" })}
              disabled={!isEditable}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <label htmlFor="cashSale" className="text-sm font-medium text-gray-700 cursor-pointer">
              This is a cash sale
            </label>
          </div>
        </div>

        {/* CUSTOMER SELECTION */}
        {!sale.isCashSale && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
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
                  onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                  disabled={!isEditable}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {showCustomerDropdown && customers.length > 0 && isEditable && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer._id}
                      onClick={() => selectCustomer(customer)}
                      className="p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-800">{customer.NAME}</div>
                      <div className="text-sm text-gray-500 mt-1">{customer.PARTYGSTIN || "No GSTIN"}</div>
                    </div>
                  ))}
                </div>
              )}

              {loadingCustomers && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
                  Loading customers...
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASH LEDGER */}
        {sale.isCashSale && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Cash Ledger
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
                disabled={!isEditable}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* INVENTORY SEARCH */}
        {isEditable && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
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
                          <div className="text-sm text-gray-500 mt-1">Stock: {item.closingQtyPieces || 0} pcs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            AED {Number(item.SALESPRICE || 0).toFixed(2)}
                          </div>
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
        )}

        {/* SELECTED ITEMS */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
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
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                          disabled={!isEditable}
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, "rate", e.target.value)}
                          disabled={!isEditable}
                          className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                          disabled={!includeVAT || !isEditable}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-800">AED {item.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          disabled={!isEditable}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TOTALS */}
        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">Summary</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-slate-300">Subtotal</span>
                <span className="text-xl font-semibold">AED {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-slate-300">VAT Amount</span>
                <span className="text-xl font-semibold">AED {totals.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-white/10 rounded-lg px-4 mt-2">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold">AED {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={submitSale}
            disabled={submitting || selectedItems.length === 0 || !isEditable}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
