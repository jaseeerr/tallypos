"use client"

import { useState, useEffect, useRef } from "react"
import MyAxiosInstance from "../utils/axios"
import {
  X,
  Search,
  Building2,
  Calendar,
  DollarSign,
  User,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"


export default function SalesList() {
  const axiosInstance = MyAxiosInstance()
const navigate = useNavigate()

  // State
  const [sales, setSales] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyName, setCompanyName] = useState("ALL")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Pagination refs
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isFetchingRef = useRef(false)
  const isMountedRef = useRef(false)
  const firstLoadCompleteRef = useRef(false)

  const limit = 50

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Show notification
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message })
    setTimeout(() => setNotification(null), 5000)
  }

const goToSaleDetails = (billNo) => {
  if (!billNo) return
  navigate(`/sale/${billNo}`)
}


  // Fetch sales
  const fetchSales = async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return

    try {
      isFetchingRef.current = true
      setLoading(true)

      const res = await axiosInstance.get("/list-sales", {
        params: {
          companyName,
          search: debouncedSearch,
          fromDate,
          toDate,
          page: pageRef.current,
          limit,
        },
      })

      const items = res.data.items || []

      if (pageRef.current === 1) {
        setSales(items)
      } else {
        setSales((prev) => [...prev, ...items])
      }

      hasMoreRef.current = res.data.hasMore || false

      // Build company filter from first page
      if (pageRef.current === 1 && companyName === "ALL") {
        const uniqueCompanies = Array.from(new Set(items.map((s) => s.companyName).filter(Boolean)))
        setCompanies(uniqueCompanies)
      }

      firstLoadCompleteRef.current = true
    } catch (err) {
      console.error("Error fetching sales:", err)
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || "Failed to fetch sales"
      const errorDetails = err.response?.data?.details || ""
      showNotification("error", "Failed to Load Sales", `${errorMessage}${errorDetails ? ": " + errorDetails : ""}`)
    } finally {
      setLoading(false)
      setInitialLoading(false)
      isFetchingRef.current = false
    }
  }

  // Reset and fetch
  const resetAndFetch = () => {
    pageRef.current = 1
    hasMoreRef.current = true
    firstLoadCompleteRef.current = false
    setSales([])
    fetchSales()
  }

  // Initial load
  useEffect(() => {
    resetAndFetch()
  }, [])

  // Filter changes (after mount)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    resetAndFetch()
  }, [companyName, debouncedSearch, fromDate, toDate])

  // Infinite scroll observer
  useEffect(() => {
    if (initialLoading || !firstLoadCompleteRef.current) return

    const sentinel = document.getElementById("sales-sentinel")
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loading) {
          pageRef.current += 1
          fetchSales()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [initialLoading, loading])

  // Get status badge
  const getStatusBadge = (status) => {
    const statusLower = (status || "").toLowerCase()

    if (statusLower === "completed" || statusLower === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
          <CheckCircle2 className="w-3 h-3" />
          {status.toUpperCase()}
        </span>
      )
    }

    if (statusLower === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
          <Clock className="w-3 h-3" />
          {status.toUpperCase()}
        </span>
      )
    }

    if (statusLower === "cancelled" || statusLower === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
          <XCircle className="w-3 h-3" />
          {status.toUpperCase()}
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 border border-gray-500/20">
        {status?.toUpperCase() || "N/A"}
      </span>
    )
  }

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "-"
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  }



  const deleteSale = async (saleId) => {
  if (!window.confirm("Are you sure you want to delete this sale?")) return;

  try {
    await axiosInstance.delete(`/deleteSale/${saleId}`);

    setSales((prev) => prev.filter((s) => s._id !== saleId));
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "Failed to delete sale. Only pending sales can be deleted."
    );
  }
};




  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-xl shadow-2xl border-l-4 p-4 animate-in slide-in-from-right ${
              notification.type === "error"
                ? "border-red-500"
                : notification.type === "success"
                  ? "border-green-500"
                  : "border-blue-500"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  notification.type === "error"
                    ? "bg-red-100"
                    : notification.type === "success"
                      ? "bg-green-100"
                      : "bg-blue-100"
                }`}
              >
                {notification.type === "error" ? (
                  <XCircle className={`w-5 h-5 text-red-600`} />
                ) : notification.type === "success" ? (
                  <CheckCircle2 className={`w-5 h-5 text-green-600`} />
                ) : (
                  <FileText className={`w-5 h-5 text-blue-600`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
              Sales Records
            </h1>
          </div>
          <p className="text-gray-600 ml-13">View and manage all sales transactions</p>
        </div>

        {/* Filters Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Company Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Company
              </label>
              <select
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Search
              </label>
              <input
                type="text"
                placeholder="Bill No or Customer"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sales List */}
        {initialLoading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading sales...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sales Found</h3>
            <p className="text-gray-600 text-center max-w-md">
              No sales records match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
           {sales.map((sale) => (
  <div
    key={sale._id}
    onDoubleClick={() => goToSaleDetails(sale.billNo)}
    onClick={() => goToSaleDetails(sale.billNo)}
    className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
  >
    {/* DELETE BUTTON (pending only) */}
    {sale.status === "pending" && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteSale(sale._id);
        }}
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-semibold rounded-lg
          bg-red-100 text-red-600 hover:bg-red-200 transition"
      >
        Delete
      </button>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
      {/* Bill Number */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Bill Number
        </div>
        <div className="text-base font-bold text-gray-900">
          #{sale.billNo || "N/A"}
        </div>
      </div>

      {/* Company */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Company
        </div>
        <div className="text-sm font-medium text-gray-900">
          {sale.companyName || "-"}
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          Customer
        </div>
        <div className="text-sm font-medium text-gray-900">
          {sale.isCashSale
            ? sale.cashLedgerName || "Cash Sale"
            : sale.partyName || "-"}
        </div>
      </div>

      {/* Date */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Date
        </div>
        <div className="text-sm font-medium text-gray-900">
          {formatDate(sale.date)}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Amount
        </div>
        <div className="text-base font-bold text-green-600">
          AED {formatCurrency(sale.totalAmount)}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-500">Status</div>
        <div>{getStatusBadge(sale.status)}</div>
      </div>
    </div>
  </div>
))}


            {/* Loading More */}
            {loading && !initialLoading && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-3" />
                <span className="text-gray-600 font-medium">Loading more sales...</span>
              </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div id="sales-sentinel" className="h-4" />

            {/* End of list */}
            {!hasMoreRef.current && sales.length > 0 && (
              <div className="text-center py-8 mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4" />
                  All sales loaded
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
