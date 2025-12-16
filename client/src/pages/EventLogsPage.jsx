"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Clock,
  Building2,
  Calendar,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  Activity,
  ChevronDown,
  Terminal,
  Package,
  Users,
  Hash,
  RefreshCw,
} from "lucide-react"
import MyAxiosInstance from "../utils/axios"

const axios = MyAxiosInstance()

export default function EventLogsPage() {
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModule, setSelectedModule] = useState("all")
  const [selectedAction, setSelectedAction] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedStage, setSelectedStage] = useState("all")
  const [selectedCompany, setSelectedCompany] = useState("all")

  const [showFilters, setShowFilters] = useState(false)

  const observerRef = useRef(null)

  // Fetch logs
  const fetchLogs = async (pageToLoad, reset = false) => {
    if (loading || (!hasMore && !reset)) return

    setLoading(true)
    setError("")

    try {
      const res = await axios.get("/getEventLogs", {
        params: {
          page: pageToLoad,
          limit: 20,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        },
      })

      const newLogs = res.data.logs || []

      setLogs((prev) => {
        if (reset) return newLogs

        const seen = new Set(prev.map((l) => l.eventId))
        const filtered = newLogs.filter((l) => !seen.has(l.eventId))
        return [...prev, ...filtered]
      })

      setHasMore(newLogs.length === 20)
    } catch (err) {
      setError(err.message || "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchLogs(1, true)
  }, [])

  // Refetch on date change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchLogs(1, true)
  }, [startDate, endDate])

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchLogs(nextPage)
        }
      },
      { threshold: 1 },
    )

    observer.observe(observerRef.current)

    return () => observer.disconnect()
  }, [observerRef, page, hasMore, loading])

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.company.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesModule = selectedModule === "all" || log.module === selectedModule
      const matchesAction = selectedAction === "all" || log.action === selectedAction
      const matchesStatus = selectedStatus === "all" || log.status === selectedStatus
      const matchesStage = selectedStage === "all" || log.stage === selectedStage
      const matchesCompany = selectedCompany === "all" || log.company === selectedCompany

      return matchesSearch && matchesModule && matchesAction && matchesStatus && matchesStage && matchesCompany
    })
  }, [logs, searchQuery, selectedModule, selectedAction, selectedStatus, selectedStage, selectedCompany])

  // Calculate insights
  const insights = useMemo(() => {
    const total = filteredLogs.length
    const errors = filteredLogs.filter((l) => l.status === "error").length
    const success = filteredLogs.filter((l) => l.status === "success").length
    const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : 0

    const avgEventsPerHour = total > 0 ? (total / 24).toFixed(1) : 0

    const lastEventTimestamp =
      filteredLogs.length > 0
        ? new Date(filteredLogs[0].timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "No events"

    const lastHour = filteredLogs.filter((l) => new Date(l.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length

    return {
      total,
      errors,
      success,
      errorRate,
      lastHour,
      lastEventTimestamp,
      avgEventsPerHour,
    }
  }, [filteredLogs])

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    return {
      modules: [...new Set(logs.map((l) => l.module))],
      actions: [...new Set(logs.map((l) => l.action))],
      stages: [...new Set(logs.map((l) => l.stage))],
      companies: [...new Set(logs.map((l) => l.company))],
    }
  }, [logs])

  const activeFiltersCount = [
    selectedModule !== "all",
    selectedAction !== "all",
    selectedStatus !== "all",
    selectedStage !== "all",
    selectedCompany !== "all",
    searchQuery !== "",
    startDate !== "",
    endDate !== "",
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-6 h-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Event Logs</h1>
            <span className="text-xs text-gray-500 font-sans mt-1">// monitoring dashboard</span>
          </div>
          <p className="text-sm text-gray-600 font-sans">Real-time system event monitoring and analysis</p>
        </div>

        {/* Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase tracking-wider font-sans">Total Events</span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{insights.total}</div>
            <div className="text-xs text-gray-500 mt-1 font-sans">{insights.lastHour} in last hour</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase tracking-wider font-sans">Error Rate</span>
              <AlertTriangle className={`w-4 h-4 ${insights.errorRate > 10 ? "text-red-500" : "text-gray-400"}`} />
            </div>
            <div className={`text-2xl font-bold ${insights.errorRate > 10 ? "text-red-600" : "text-gray-900"}`}>
              {insights.errorRate}%
            </div>
            <div className="text-xs text-gray-500 mt-1 font-sans">
              {insights.errors} errors / {insights.success} success
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase tracking-wider font-sans">Avg / Hour</span>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{insights.avgEventsPerHour}</div>
            <div className="text-xs text-gray-500 mt-1 font-sans">events per hour</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase tracking-wider font-sans">Last Event</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm font-bold text-gray-900 leading-tight">{insights.lastEventTimestamp}</div>
            <div className="text-xs text-gray-500 mt-1 font-sans">most recent activity</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event ID, message, or company..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-200 font-sans"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:bg-white transition-all duration-200"
            >
              <span className="flex items-center gap-2 font-sans">
                <Filter className="w-4 h-4" />
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Date Filters */}
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <Calendar className="w-3 h-3" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <Calendar className="w-3 h-3" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  />
                </div>

                {/* Module Filter */}
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <Package className="w-3 h-3" />
                    Module
                  </label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  >
                    <option value="all">All Modules</option>
                    {uniqueValues.modules.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Filter */}
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <Activity className="w-3 h-3" />
                    Action
                  </label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  >
                    <option value="all">All Actions</option>
                    {uniqueValues.actions.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <TrendingUp className="w-3 h-3" />
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Stage Filter */}
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <RefreshCw className="w-3 h-3" />
                    Stage
                  </label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  >
                    <option value="all">All Stages</option>
                    {uniqueValues.stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Filter */}
                <div className="lg:col-span-3">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-sans">
                    <Building2 className="w-3 h-3" />
                    Company
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors duration-200"
                  >
                    <option value="all">All Companies</option>
                    {uniqueValues.companies.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="font-sans text-sm">{error}</div>
          </div>
        )}

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 && !loading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2 font-sans">No Events Found</h3>
              <p className="text-sm text-gray-500 font-sans">
                {activeFiltersCount > 0
                  ? "Try adjusting your filters or search query"
                  : "No events have been logged yet"}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={`${log.eventId}-${log.timestamp}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {log.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 font-sans">
                          {log.module === "customers" && (
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              customers
                            </span>
                          )}
                          {log.module === "inventory" && (
                            <span className="inline-flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />
                              inventory
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-xs text-gray-600 uppercase tracking-wider">{log.action}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-xs text-gray-600 uppercase tracking-wider">{log.stage}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{log.eventId}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-3">
                  <p className="text-sm text-gray-700 font-sans leading-relaxed">{log.message}</p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-sans">{log.company}</span>
                  </div>

                  {log.metadata?.userName && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-sans">{log.metadata.userName}</span>
                    </div>
                  )}

                  {log.metadata?.userId && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono">{log.metadata.userId}</span>
                    </div>
                  )}

                  {log.metadata?.duration && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono">{log.metadata.duration}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-8 animate-in fade-in duration-200">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && !loading && <div ref={observerRef} className="h-4" />}

        {/* End of Results */}
        {!hasMore && filteredLogs.length > 0 && (
          <div className="text-center py-8 text-sm text-gray-500 font-sans">End of results</div>
        )}
      </div>
    </div>
  )
}
