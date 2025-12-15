"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  CreditCard,
  Package,
  Receipt,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Activity,
  DollarSign,
} from "lucide-react"
import MyAxiosInstance from "../utils/axios"

export default function ViewSale() {
  const axiosInstance = MyAxiosInstance()
  const { billNo } = useParams()
  const navigate = useNavigate()

  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogs, setShowLogs] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await axiosInstance.get(`/sale/${billNo}`)
        setSale(res.data.sale)
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to fetch sale details"
        const errorDetails = err.response?.data?.details || ""

        setNotification({
          type: "error",
          title: "Failed to Load Sale",
          message: errorMessage,
          details: errorDetails,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSale()
  }, [billNo])

  const closeNotification = () => {
    setNotification(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Loading sale details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sale Not Found</h2>
            <p className="text-slate-600">The sale you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "synced":
        return "bg-green-100 text-green-700 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "failed":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
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
                    <AlertCircle
                      className={`w-5 h-5 ${notification.type === "error" ? "text-red-600" : "text-green-600"}`}
                    />
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
                    className={`flex-shrink-0 ${
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
   <div className="mb-6 flex items-center justify-between">
  {/* Back */}
  <button
    onClick={() => navigate(-1)}
    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-slate-700 hover:text-slate-900"
  >
    <ArrowLeft className="w-4 h-4" />
    <span className="font-medium">Back</span>
  </button>

  {/* Actions */}
  <div className="flex items-center gap-3">
    {/* Edit Sale */}
    {sale.status && (
   <button
  disabled={sale.status !== "pending"}
  onClick={() => {
    if (sale.status === "pending") {
      navigate(`/editSale/${billNo}`)
    }
  }}
  className={`hidden px-4 py-2 rounded-lg font-medium transition-all ${
    sale.status === "pending"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-200 text-gray-500 cursor-not-allowed"
  }`}
>
  Edit Sale
</button>


    )}

    {/* Status */}
    <div
      className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${getStatusColor(
        sale.status
      )}`}
    >
      {sale.status?.toUpperCase() || "UNKNOWN"}
    </div>
  </div>
</div>


        {/* Sale Header Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8" />
                <h1 className="text-3xl sm:text-4xl font-bold">Sale #{sale.billNo}</h1>
              </div>
              <p className="text-indigo-100 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {sale.companyName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Date
              </div>
              <div className="text-lg font-semibold">
                {new Date(sale.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
                <Activity className="w-4 h-4" />
                Sync Attempts
              </div>
              <div className="text-lg font-semibold">{sale.syncAttempts || 0}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Total Amount
              </div>
              <div className="text-lg font-semibold">AED {sale.totalAmount?.toFixed(2) || "0.00"}</div>
            </div>
          </div>

          {sale.syncError && (
            <div className="mt-4 bg-red-500/20 border-2 border-red-300/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Sync Error</p>
                  <p className="text-sm text-red-100">{sale.syncError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Party Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-4">
            {sale.isCashSale ? (
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900">Party Details</h2>
          </div>

          {sale.isCashSale ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <p className="font-semibold text-green-900 mb-2">Cash Sale</p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Ledger:</span> {sale.cashLedgerName}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="mb-3">
                <p className="text-sm text-slate-600 mb-1">Customer Name</p>
                <p className="font-semibold text-slate-900">{sale.partyName}</p>
              </div>

              {sale.partyAddress?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </p>
                  <div className="space-y-2">
                    {sale.partyAddress.map((a, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 text-sm text-slate-700">
                        {a.address}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Unit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">VAT %</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{item.unit || "pcs"}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{item.qty}</td>
                    <td className="py-3 px-4 text-right text-slate-700">AED {item.rate?.toFixed(2) || "0.00"}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{item.rateOfTax || 0}%</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      AED {item.amount?.toFixed(2) || "0.00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Summary</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-slate-300">Subtotal</span>
              <span className="text-xl font-semibold">AED {sale.subtotal?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-slate-300">VAT Amount</span>
              <span className="text-xl font-semibold">AED {sale.vatAmount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-white/10 rounded-lg px-4 mt-2">
              <span className="text-lg font-semibold">Total Amount</span>
              <span className="text-2xl font-bold">AED {sale.totalAmount?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>

        {/* Ledgers Card */}
        {sale.ledgers?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Ledgers</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ledger Name</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.ledgers.map((l, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{l.ledgerName}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        AED {l.amount?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tally Logs Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Tally Logs</h2>
            </div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <span className="font-medium">{showLogs ? "Hide" : "Show"} Logs</span>
              {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showLogs && (
            <div className="mt-4 space-y-3">
              {(!sale.tallyResponseLogs || sale.tallyResponseLogs.length === 0) && (
                <div className="bg-slate-50 rounded-lg p-6 text-center border-2 border-dashed border-slate-200">
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No logs available</p>
                </div>
              )}

              {sale.tallyResponseLogs?.map((log, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">Log #{idx + 1}</span>
                  </div>
                  <pre className="p-4 text-xs text-slate-700 overflow-auto max-h-96">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
