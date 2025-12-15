"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import { ArrowLeft, FileText, Calendar, User, Building2, Package, Loader2, AlertCircle, DollarSign } from "lucide-react"

export default function ViewOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const axios = MyAxiosInstance()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // =============================
  // FETCH ORDER
  // =============================
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`/sale-orders/${id}`)
        setOrder(res.data.item)
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load sale order")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])

  // =============================
  // STATES
  // =============================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading sale order...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-600 font-medium text-center">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!order) return null

  // =============================
  // TOTALS
  // =============================
  const subtotal = order.items.reduce((s, i) => s + (i.amount || 0), 0)
  const vat = order.items.reduce((s, i) => s + ((i.amount || 0) * (i.rateOfTax || 0)) / 100, 0)

  const total = subtotal + vat

  // =============================
  // RENDER
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/20 text-gray-700 hover:shadow-md hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Orders</span>
        </button>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Sale Order #{order.billNo}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Order Details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <Calendar className="text-blue-600" size={20} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="font-semibold text-gray-800">{new Date(order.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <User className="text-purple-600" size={20} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Party</p>
                <p className="font-semibold text-gray-800">{order.partyName || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
              <Building2 className="text-emerald-600" size={20} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
                <p className="font-semibold text-gray-800">{order.companyName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="p-6 border-b border-gray-200/50 flex items-center gap-3">
            <Package className="text-blue-600" size={20} />
            <h2 className="text-xl font-bold text-gray-800">Order Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200/50">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{item.itemName}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700 font-medium">{item.qty}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.unit}</td>
                    <td className="px-6 py-4 text-right text-gray-700 font-medium">
                      AED {Number(item.rate).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                      AED {Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="text-emerald-600" size={20} />
            <h2 className="text-xl font-bold text-gray-800">Order Summary</h2>
          </div>

          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="text-gray-800 font-semibold">AED {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-gray-600 font-medium">VAT</span>
              <span className="text-gray-800 font-semibold">AED {vat.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 mt-4">
              <span className="text-lg font-bold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">AED {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
