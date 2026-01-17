"use client"

import { useEffect, useRef, useState } from "react"
import MyAxiosInstance from "../utils/axios"
import { useNavigate } from "react-router-dom"
import { ShoppingCart, Building2, User, Calendar, DollarSign, Search, Loader2, FileText, Filter } from "lucide-react"

export default function SaleOrdersList() {
  const axios = MyAxiosInstance()
  const navigate = useNavigate()

  const goToOrder = (orderId) => {
    navigate(`/viewOrder/${orderId}`)
  }

  // =============================
  // STATE
  // =============================
  const [companyName, setCompanyName] = useState("ALL")
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
const [fromDate, setFromDate] = useState("")
const [toDate, setToDate] = useState("")
  const observerRef = useRef(null)
  const bottomRef = useRef(null)

  // =============================
  // FETCH SALE ORDERS
  // =============================
const fetchOrders = async (pageToLoad = 1, reset = false) => {
  if (loading) return

  try {
    setLoading(true)
    setError(null)

    const res = await axios.get("/sale-orders", {
      params: {
        companyName,
        search,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: pageToLoad,
        limit: 20,
      },
    })

    if (res.data.ok) {
      setOrders((prev) =>
        reset ? res.data.items : [...prev, ...res.data.items]
      )
      setHasMore(res.data.hasMore)
      setPage(pageToLoad)
    }
  } catch (err) {
    setError("Failed to load sale orders")
  } finally {
    setLoading(false)
  }
}


  // =============================
  // INITIAL LOAD / FILTER CHANGE
  // =============================
  useEffect(() => {
    setOrders([])
    setPage(1)
    setHasMore(true)
    fetchOrders(1, true)
  }, [companyName, search,fromDate,toDate])

  // =============================
  // INFINITE SCROLL OBSERVER
  // =============================
  useEffect(() => {
    if (!hasMore) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          fetchOrders(page + 1)
        }
      },
      { rootMargin: "200px" },
    )

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, page])

    const isFlutter = !!window.__IS_FLUTTER_APP__;

    
  // =============================
  // RENDER
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
<div className={`mb-8 ${isFlutter === true ? "mt-10" : ""}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-md">
              <ShoppingCart className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Sale Orders</h1>
          </div>
          <p className="text-gray-600 ml-16">Manage and track all your sales orders</p>
        </div>

        {/* FILTERS CARD */}
       <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-5 sm:p-6 mb-8 border border-white/50">
  <div className="flex items-center gap-2 mb-5">
    <Filter className="w-5 h-5 text-indigo-600" />
    <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Company */}
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <Building2 className="w-4 h-4" />
        Company
      </label>
      <select
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="AMANA-FIRST-TRADING-LLC">AMANA FIRST</option>
        <option value="FANCY-PALACE-TRADING-LLC">Fancy Palace</option>
        <option value="ALL">All Companies</option>
      </select>
    </div>

    {/* Search */}
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <Search className="w-4 h-4" />
        Search
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Bill, party, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 pl-10 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>

    {/* Start Date */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Start Date
      </label>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      />
    </div>

    {/* End Date */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        End Date
      </label>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      />
    </div>
  </div>
</div>


        {/* LOADING STATE (Initial) */}
        {loading && orders.length === 0 && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-12 border border-white/50">
            <div className="flex flex-col items-center justify-center text-gray-600">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <p className="text-lg font-medium">Loading sale orders...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait a moment</p>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && orders.length === 0 && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-12 border border-white/50">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <div className="p-4 bg-indigo-50 rounded-full mb-4">
                <FileText className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sale Orders Found</h3>
              <p className="text-gray-600 text-center max-w-md">
                We couldn't find any sale orders matching your criteria. Try adjusting your filters or search terms.
              </p>
            </div>
          </div>
        )}

        {/* ORDERS GRID */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div
                key={order._id}
                onClick={() => goToOrder(order._id)}
                className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-white/90 group"
              >
                {/* Bill Number - Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-600">Order No</span>
                  </div>
                  <span className="text-lg font-bold text-indigo-600 group-hover:text-indigo-700">{order.billNo}</span>
                </div>

                {/* Order Details */}
                <div className="space-y-3">
                  {/* Company Name */}
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Company</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{order.companyName || "-"}</p>
                    </div>
                  </div>

                  {/* Party Name */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Party</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{order.partyName || "-"}</p>
                    </div>
                  </div>

                  {/* Order Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(order.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-start gap-3 pt-3 mt-3 border-t border-gray-200">
                    <DollarSign className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Total Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        AED {Number(order.totalAmount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50/70 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-red-200/50 mt-6">
            <p className="text-red-600 text-center font-medium">{error}</p>
          </div>
        )}

        {/* INFINITE SCROLL LOADER */}
        {loading && orders.length > 0 && (
          <div className="flex items-center justify-center py-8 mt-6">
            <div className="bg-white/70 backdrop-blur-md rounded-full shadow-lg px-6 py-3 border border-white/50">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Loading more orders...</span>
              </div>
            </div>
          </div>
        )}

        {/* SENTINEL */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}
