"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X, Users, Grid3x3, List } from "lucide-react"
import MyAxiosInstance from "../utils/axios"

export default function CustomersPage() {
  const axiosInstance = MyAxiosInstance()

  // =====================
  // STATE
  // =====================
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCompany, setActiveCompany] = useState("ALL")
  const [viewMode, setViewMode] = useState("grid")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // =====================
  // REFS (pagination guards)
  // =====================
  const loaderRef = useRef(null)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const isFetchingRef = useRef(false)
  const isMountedRef = useRef(false)

  // =====================
  // DEBOUNCE SEARCH
  // =====================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // =====================
  // FETCH
  // =====================
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

  // =====================
  // INITIAL LOAD
  // =====================
  useEffect(() => {
    fetchCustomers(true)
    isMountedRef.current = true
  }, [])

  // =====================
  // RESET ON FILTER CHANGE
  // =====================
  useEffect(() => {
    if (!isMountedRef.current) return

    pageRef.current = 1
    hasMoreRef.current = true
    setCustomers([])
    setInitialLoading(true)

    fetchCustomers(true)
  }, [debouncedSearch, activeCompany])

  // =====================
  // INFINITE SCROLL
  // =====================
  useEffect(() => {
    if (initialLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (
          entry.isIntersecting &&
          hasMoreRef.current &&
          !isFetchingRef.current
        ) {
          fetchCustomers(false)
        }
      },
      { rootMargin: "200px" }
    )

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [initialLoading])

  // =====================
  // UI
  // =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Customers
                </h1>
                <p className="text-xs text-slate-500">{customers.length} loaded</p>
              </div>
            </div>

            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-400"
                }`}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-400"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, group, address..."
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-1" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No customers found
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div key={c._id} className="bg-white rounded-2xl p-4 shadow-sm border">
                <h3 className="font-semibold text-slate-800">{c.name}</h3>
                <p className="text-xs text-slate-500">{c.group || "—"}</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {Array.isArray(c.address) ? c.address.join(", ") : "-"}
                </p>
                <div className="text-xs text-slate-400 mt-3">
                  {c.companyName || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c._id} className="bg-white rounded-xl p-3 border">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-slate-500">{c.group || "—"}</div>
                <div className="text-xs text-slate-600">
                  {Array.isArray(c.address) ? c.address.join(", ") : "-"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={loaderRef} className="py-6 text-center">
          {loading && <span className="text-slate-500">Loading more...</span>}
        </div>
      </main>
    </div>
  )
}
