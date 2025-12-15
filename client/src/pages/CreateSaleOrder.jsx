"use client"

import { useEffect, useState, useRef } from "react"
import QRBarcodeScanner from "react-qr-barcode-scanner"
import MyAxiosInstance from "../utils/axios"
import {
  X,
  Plus,
  Search,
  Package,
  Users,
  Calendar,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  QrCode,
} from "lucide-react"

export default function CreateSaleOrder() {
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
  const [autoAdd, setAutoAdd] = useState(true)
  const [scannedProduct, setScannedProduct] = useState(null)
  const [loadingScan, setLoadingScan] = useState(false)

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

  // =============================
  // HELPER FUNCTIONS
  // =============================
  const extractUnit = (units = "") => {
    if (!units) return "pcs"
    return units.split(" of ")[0] || "pcs"
  }

  const UNIT_MULTIPLIER = {
    PCS: 1,
    DOZEN: 12,
    GROSS: 144,
    PAIR: 2,
  }

  const normalizeUnit = (units = "") => {
    if (!units) return { display: "pcs", multiplier: 1 }

    const u = units.toLowerCase()

    if (u.includes("doz")) return { display: "Doz", multiplier: 12 }
    if (u.includes("gross")) return { display: "Gross", multiplier: 144 }
    if (u.includes("pair")) return { display: "Pair", multiplier: 2 }

    return { display: "pcs", multiplier: 1 }
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
  // FETCH PRODUCT BY QR
  // =============================
  const fetchProductById = async (id) => {
    try {
      setLoadingScan(true)
      setScannedProduct(null)

      const res = await axios.post(`/inventory/${id}`, {
        companyName,
      })

      if (res.data.ok) {
        const product = res.data.product
        setScannedProduct(product)

        if (autoAdd) {
          if (product.companyName !== companyName) {
            showNotification(
              "warning",
              "Company Mismatch",
              `The scanned product "${product.NAME}" belongs to ${product.companyName}, but you have selected ${companyName}. Please check your selection.`,
            )
            return
          }

          if (!product.disable) {
            addItem(product)
            showNotification("success", "Product Scanned", `${product.NAME} has been added to the sale order.`)
          }
        }
      }
    } catch (err) {
      showNotification("error", "Product Not Found", "Unable to find the scanned product. Please try again.")
      console.error(err)
    } finally {
      setLoadingScan(false)
    }
  }

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

    const { display: unit, multiplier: piecesPerUnit } = normalizeUnit(item.UNITS)

    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item._id,
        name: item.NAME,
        stock: item.closingQtyPieces || 0, // PCS (source of truth)
        stockFormatted: item.CLOSINGQTY || "0", // display only
        unit,
        piecesPerUnit, // 12 for Doz
        qty: 1,
        rate: Number(item.SALESPRICE) || 0,
        rateOfTax: 5,
        amount: Number(item.SALESPRICE) || 0,
      },
    ])

    setInventorySearch("")
    setInventory([])
    setShowInventoryDropdown(false)
    showNotification("success", "Item added", `${item.NAME} has been added to the sale order.`)
  }

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems]
    const numValue = Number(value) || 0

    if (field === "qty") {
      const item = updated[index]

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
        window.location.reload()
      }, 2000)
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
                Create Sale Order
              </h1>
              <p className="text-gray-500 mt-1">Enter sale order details and add items</p>
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
              <button
                onClick={() => setScannerOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md flex items-center gap-2 font-medium"
              >
                <QrCode className="w-5 h-5" />
                Scan QR
              </button>
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
                          Stock: {item.stockFormatted}({item.stock} pcs)
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
                          Stock: {item.stockFormatted}
                          {item.stock !== undefined && (
                            <span className="text-xs text-gray-400 ml-1">({item.stock} pcs)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-600">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.qty}
                            onChange={(e) => updateItem(idx, "qty", e.target.value)}
                            className={`w-24 px-3 py-1.5 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none ${
                              item.qty * (item.piecesPerUnit || 1) > item.stock
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                          />
                          {item.qty * (item.piecesPerUnit || 1) > item.stock && (
                            <span className="text-xs text-red-600 font-medium">Exceeds stock!</span>
                          )}
                        </div>
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
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVAT}
                    onChange={() => setIncludeVAT(!includeVAT)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  Include VAT
                </label>
              </div>

              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">AED {subtotal.toFixed(2)}</span>
                </div>
                {includeVAT && (
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium">VAT:</span>
                    <span className="font-semibold">AED {vatAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total:</span>
                  <span className="text-blue-600">AED {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end gap-3">
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
        </div>

        {/* SCANNER MODAL */}
        {scannerOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-blue-600" />
                    Scan Product QR Code
                  </h3>
                  <button
                    onClick={() => setScannerOpen(false)}
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{scannedProduct.NAME}</p>
                        <p className="text-sm text-gray-600 mt-1">Company: {scannedProduct.companyName}</p>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          Price: AED {Number(scannedProduct.SALESPRICE || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stock: {scannedProduct.CLOSINGQTY || "0"}
                          {scannedProduct.closingQtyPieces !== undefined && (
                            <span className="text-xs text-gray-500 ml-1">({scannedProduct.closingQtyPieces} pcs)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={scannedProduct.disable}
                      onClick={() => {
                        addItem(scannedProduct)
                        setScannerOpen(false)
                      }}
                      className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Sale Order
                    </button>
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
    </div>
  )
}
