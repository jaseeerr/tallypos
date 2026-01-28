'use client';

import { useEffect, useState } from "react"
import { Calendar, ImageIcon, Edit, Trash2, Plus, TrendingUp, Activity, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react"
import MyAxiosInstance from "../../utils/axios"

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    const axiosInstance = MyAxiosInstance()

    async function fetchLogs() {
      try {
        setLoading(true)
        const res = await axiosInstance.get("/dataEntry/logs")
        console.log("Data entry logs:", res.data)

        if (isMounted) {
          setLogs(res.data?.items || [])
        }
      } catch (err) {
        console.error("Fetch data entry logs error:", err)
        if (isMounted) {
          setError("Failed to load logs.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      isMounted = false
    }
  }, [])

  // Calculate insights
  const calculateInsights = () => {
    const totalImagesAdded = logs
      .filter(log => log.action === "add")
      .reduce((acc, log) => acc + (log.imageCount || 0), 0)
    const totalImagesDeleted = logs
      .filter(log => log.action === "delete")
      .reduce((acc, log) => acc + (log.imageCount || 0), 0)
    const totalEdits = logs.filter(log => log.action === "edit").length
    const totalAdds = logs.filter(log => log.action === "add").length
    const totalDeletes = logs.filter(log => log.action === "delete").length
    const successCount = logs.filter(log => log.status === "success").length
    const failureCount = logs.filter(log => log.status === "failure" || log.status === "error").length
    
    // Group by date
    const dateMap = {}
    logs.forEach(log => {
      if (log.timestamp) {
        const date = new Date(log.timestamp).toISOString().split('T')[0]
        if (!dateMap[date]) {
          dateMap[date] = {
            imagesAdded: 0,
            imagesDeleted: 0,
            edits: 0,
            adds: 0,
            deletes: 0,
            total: 0
          }
        }
        if (log.action === "add") dateMap[date].imagesAdded += log.imageCount || 0
        if (log.action === "delete") dateMap[date].imagesDeleted += log.imageCount || 0
        dateMap[date].total += 1
        if (log.action === "edit") dateMap[date].edits += 1
        if (log.action === "add") dateMap[date].adds += 1
        if (log.action === "delete") dateMap[date].deletes += 1
      }
    })

    return {
      totalImagesAdded,
      totalImagesDeleted,
      totalEdits,
      totalAdds,
      totalDeletes,
      successCount,
      failureCount,
      totalLogs: logs.length,
      dateMap
    }
  }

  const insights = calculateInsights()

  // Generate calendar dates (Jan 28 to Feb 13, 2026)
  const generateCalendarDates = () => {
    const dates = []
    const startDate = new Date("2026-01-28")
    const endDate = new Date("2026-02-13")
    
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const calendarDates = generateCalendarDates()

  const getActionIcon = (action) => {
    switch (action) {
      case "add":
        return <Plus className="w-4 h-4" />
      case "edit":
        return <Edit className="w-4 h-4" />
      case "delete":
        return <Trash2 className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case "add":
        return "bg-green-100 text-green-700 border-green-200"
      case "edit":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "delete":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading logs...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-600" />
            Data Entry Logs
          </h1>
          <p className="text-slate-600">Track all inventory changes, image uploads, and product edits</p>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">Activity Calendar</h2>
            <span className="text-sm text-slate-500 ml-2">(Jan 28 - Feb 13, 2026)</span>
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {calendarDates.map(date => {
              const dateStr = date.toISOString().split('T')[0]
              const dayData = insights.dateMap[dateStr] || { imagesAdded: 0, imagesDeleted: 0, edits: 0, total: 0 }
              const hasActivity = dayData.total > 0
              
              return (
                <div
                  key={dateStr}
                  className={`relative rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                    hasActivity 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-2">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-slate-600 mb-1">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  
                  {hasActivity && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-blue-600">
                          <ImageIcon className="w-3 h-3" />
                          Added
                        </span>
                        <span className="font-bold text-blue-700">{dayData.imagesAdded}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-red-600">
                          <Trash2 className="w-3 h-3" />
                          Deleted
                        </span>
                        <span className="font-bold text-red-700">{dayData.imagesDeleted}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <Edit className="w-3 h-3" />
                          Edits
                        </span>
                        <span className="font-bold text-green-700">{dayData.edits}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Total</span>
                        <span className="font-bold text-slate-700">{dayData.total}</span>
                      </div>
                    </div>
                  )}
                  
                  {!hasActivity && (
                    <div className="mt-3 text-center text-xs text-slate-400">
                      No activity
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Images */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <ImageIcon className="w-8 h-8 opacity-80" />
              <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                Total
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{insights.totalImagesAdded}</div>
            <div className="text-blue-100 text-sm font-medium">Images Added</div>
          </div>

          {/* Total Edits */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Edit className="w-8 h-8 opacity-80" />
              <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                Edits
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{insights.totalEdits}</div>
            <div className="text-green-100 text-sm font-medium">Product Edits</div>
          </div>

          {/* Total Adds */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Plus className="w-8 h-8 opacity-80" />
              <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                Adds
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{insights.totalImagesAdded}</div>
            <div className="text-purple-100 text-sm font-medium">Images Added</div>
          </div>

          {/* Total Deletes */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Trash2 className="w-8 h-8 opacity-80" />
              <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                Deletes
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">{insights.totalImagesDeleted}</div>
            <div className="text-red-100 text-sm font-medium">Images Deleted</div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-100 rounded-full p-3">
                <Activity className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{insights.totalLogs}</div>
                <div className="text-sm text-slate-600">Total Activities</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-700">{insights.successCount}</div>
                <div className="text-sm text-slate-600">Successful Operations</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <div className="text-3xl font-bold text-red-700">{insights.failureCount}</div>
                <div className="text-sm text-slate-600">Failed Operations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mb-28">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-slate-600" />
              Complete Activity Log
            </h2>
            <p className="text-sm text-slate-600 mt-1">Detailed view of all operations</p>
          </div>

          {logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Inventory ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Images
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Fields Updated
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log, index) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-medium text-sm ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === "success" ? (
                          <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {log.inventoryId?.slice(0, 10)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.imageCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold">
                            <ImageIcon className="w-4 h-4" />
                            {log.imageCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.updatedFields?.length > 0 ? (
                          log.action === "edit" ? (
                            <div className="space-y-2">
                              {log.updatedFields.map((field, i) => (
                                <div key={i} className="text-xs text-slate-700">
                                  <div className="font-semibold text-amber-700">{field}</div>
                                  <div className="text-slate-600">
                                    <span className="text-slate-500">Before:</span>{" "}
                                    <span className="font-mono">{String(log.beforeValues?.[field] ?? "-")}</span>
                                  </div>
                                  <div className="text-slate-600">
                                    <span className="text-slate-500">After:</span>{" "}
                                    <span className="font-mono">{String(log.afterValues?.[field] ?? "-")}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {log.updatedFields.map((field, i) => (
                                <span key={i} className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">
                                  {field}
                                </span>
                              ))}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                        {log.errorMessage && (
                          <span className="text-red-600">{log.errorMessage}</span>
                        )}
                        {log.filenames?.length > 0 && (
                          <div className="text-xs text-slate-500">
                            {log.filenames.length} file(s)
                          </div>
                        )}
                        {!log.errorMessage && !log.filenames?.length && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
