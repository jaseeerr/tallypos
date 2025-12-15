"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Search, X, Users, Phone, MapPin, Building2 } from "lucide-react"
import MyAxiosInstance from "../utils/axios"

export default function CustomersPage() {
  const axiosInstance = MyAxiosInstance()

  // STATE
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // REFS
  const loaderRef = useRef(null)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isFetchingRef = useRef(false)
  const isMountedRef = useRef(false)

  // DEBOUNCE SEARCH
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // FETCH CUSTOMERS
  async function fetchCustomers(reset = false) {
    if (isFetchingRef.current) return
    if (!reset && !hasMoreRef.current) return

    isFetchingRef.current = true
    setLoading(true)

    const currentPage = reset ? 1 : pageRef.current

    try {
      const res = await axiosInstance.get("/customers", {
        params: {
          page: currentPage,
          limit: 100,
          search: debouncedSearch,
          companyName: activeCompany === "ALL" ? "" : activeCompany,
        },
      })
console.log(res.data)
      const items = res.data.items || []

      if (reset) {
        setCustomers(items)
        pageRef.current = 2
      } else {
        setCustomers((prev) => [...prev, ...items])
        pageRef.current += 1
      }

      hasMoreRef.current = res.data.hasMore
      setInitialLoading(false)
    } catch (err) {
      console.error("Error fetching customers:", err)
      setInitialLoading(false)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  // INITIAL LOAD
  useEffect(() => {
    fetchCustomers(true)
    isMountedRef.current = true
  }, [])

  // RESET ON FILTER CHANGE
  useEffect(() => {
    if (!isMountedRef.current) return

    pageRef.current = 1
    hasMoreRef.current = true
    setCustomers([])
    setInitialLoading(true)

    fetchCustomers(true)
  }, [debouncedSearch, activeCompany])

  // INFINITE SCROLL
  useEffect(() => {
    if (initialLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          fetchCustomers(false)
        }
      },
      { rootMargin: "200px" },
    )

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [initialLoading])

  // DERIVE COMPANY FILTER OPTIONS
  const companyOptions = useMemo(() => {
    const set = new Set()
    customers.forEach((c) => {
      if (c.companyName) {
        set.add(c.companyName)
      }
    })
    return ["ALL", ...Array.from(set).sort()]
  }, [customers])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Customers
              </h1>
              <p className="text-sm text-slate-500">
                {customers.length} customer{customers.length !== 1 ? "s" : ""} loaded
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, group, or address..."
              className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* COMPANY FILTER */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {companyOptions.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCompany(c)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCompany === c
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {c === "ALL" ? "All Companies" : c}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 animate-pulse"
              >
                <div className="h-6 bg-slate-200 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No customers found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => {
              const addressText = Array.isArray(customer.address)
                ? customer.address.filter(Boolean).join(", ")
                : customer.address || "No address provided"

              return (
                <div
                  key={customer._id}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Customer Name */}
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {customer.name}
                  </h3>

                  {/* Group Badge */}
                  {customer.group && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 mb-3">
                      <Phone size={12} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">{customer.group}</span>
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-3 min-h-[44px]">
                    <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{addressText}</p>
                  </div>

                  {/* Company */}
                  {customer.companyName && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">{customer.companyName}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Infinite Scroll Loader */}
        <div ref={loaderRef} className="py-8 text-center">
          {loading && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-600">Loading more customers...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
