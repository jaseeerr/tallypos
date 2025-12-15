"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Package,
} from "lucide-react"

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
        setError(
          err.response?.data?.message || "Failed to load sale order"
        )
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
      <div className="p-8 text-center text-gray-500">
        Loading sale order...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    )
  }

  if (!order) return null

  // =============================
  // TOTALS
  // =============================
  const subtotal = order.items.reduce((s, i) => s + (i.amount || 0), 0)
  const vat =
    order.items.reduce(
      (s, i) => s + ((i.amount || 0) * (i.rateOfTax || 0)) / 100,
      0,
    )

  const total = subtotal + vat

  // =============================
  // RENDER
  // =============================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border">

        {/* HEADER */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" />
            <h1 className="text-2xl font-bold">
              Sale Order #{order.billNo}
            </h1>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* INFO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" />
            <span>
              {new Date(order.date).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <User className="text-gray-400" />
            <span>{order.partyName || "-"}</span>
          </div>

          <div className="font-semibold">
            Company: {order.companyName}
          </div>
        </div>

        {/* ITEMS */}
        <div className="overflow-x-auto border-t">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Item</th>
                <th className="px-4 py-3 text-center text-sm">Qty</th>
                <th className="px-4 py-3 text-center text-sm">Unit</th>
                <th className="px-4 py-3 text-right text-sm">Rate</th>
                <th className="px-4 py-3 text-right text-sm">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {item.itemName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.qty}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    AED {Number(item.rate).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    AED {Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="p-6 border-t bg-gray-50">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>AED {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>VAT</span>
              <span>AED {vat.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-blue-600">
                AED {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
