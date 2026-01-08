"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MyAxiosInstance from "../utils/axios"
import jsPDF from "jspdf"
import { API_BASE } from "../utils/url"
import autoTable from "jspdf-autotable"

import { ArrowLeft, FileText, Calendar, User, Building2, Package, Loader2, AlertCircle, DollarSign } from "lucide-react"

export default function ViewOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const axios = MyAxiosInstance()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [converting, setConverting] = useState(false)
const [convertError, setConvertError] = useState(null)

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


  
  const handleConvertToSale = async () => {
  try {
    setConverting(true)
    setConvertError(null)

    const res = await axios.post(`/convertOrderToSale/${id}`)

    // update local order state
    setOrder((prev) => ({
      ...prev,
      converted: true,
      convertedAt: new Date().toISOString()
    }))
  } catch (err) {
    setConvertError(
      err.response?.data?.message || "Failed to convert sale order"
    )
  } finally {
    setConverting(false)
  }
}

const fetchInventoryImages = async (itemNames) => {
  try {
    const res = await axios.post("/inventoryBulkImages", {
      names: itemNames,
    })

    // API already returns a map by product name
    // Normalize to { [name]: images[] }
    const imageMap = {}

    const items = res.data?.items || {}

    for (const name of itemNames) {
      imageMap[name] = items[name]?.images || []
    }

    return imageMap
  } catch (err) {
    console.error("Failed to fetch inventory images", err)
    return {}
  }
}


async function loadImageAsBase64(imagePath) {
  const res = await fetch(
    `${API_BASE}/inventory-image?path=${encodeURIComponent(imagePath)}`
  )

  if (!res.ok) {
    throw new Error("Image load failed")
  }

  const blob = await res.blob()

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}




const generateSaleOrderPDF = async () => {
  const doc = new jsPDF("p", "mm", "a4")

  const marginX = 14
  let cursorY = 18

  // ===== HEADER =====
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(order.companyName, marginX, cursorY)

  cursorY += 6
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Sale Order #${order.billNo}`, marginX, cursorY)

  cursorY += 5
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, marginX, cursorY)

  cursorY += 5
  doc.text(`Party: ${order.partyName || "-"}`, marginX, cursorY)

  cursorY += 8

  // ===== ITEMS TABLE =====
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    head: [["Item", "Qty", "Unit", "Rate", "Tax %", "Amount"]],
    body: order.items.map((i) => [
      i.itemName,
      i.qty,
      i.unit,
      `AED ${Number(i.rate).toFixed(2)}`,
      i.rateOfTax,
      `AED ${Number(i.amount).toFixed(2)}`,
    ]),
  })

  cursorY = doc.lastAutoTable.finalY + 8

  // ===== TOTALS =====
  doc.setFont("helvetica", "bold")
  doc.text(`Subtotal: AED ${subtotal.toFixed(2)}`, 140, cursorY)

  cursorY += 5
  doc.text(`VAT: AED ${vat.toFixed(2)}`, 140, cursorY)

  cursorY += 5
  doc.text(`Total: AED ${total.toFixed(2)}`, 140, cursorY)

  cursorY += 10

  // ===== PRODUCT IMAGES =====
  const itemNames = order.items.map((i) => i.itemName)
  const imageMap = await fetchInventoryImages(itemNames)
console.log(order)
  doc.setFontSize(14)
  doc.text("Product Images", marginX, cursorY)
  cursorY += 6

  let x = marginX
  let y = cursorY
  const imgSize = 32

  for (const name of itemNames) {
    const images = imageMap[name] || []

    for (const img of images) {
      if (y + imgSize > 280) {
        doc.addPage()
        x = marginX
        y = 20
      }

      const imgUrl = `${API_BASE}/${img}`
     const image = await loadImageAsBase64(img)
if (!image) continue

doc.addImage(
  image.base64,
  image.type,
  x,
  y,
  imgSize,
  imgSize
)

      x += imgSize + 4
      if (x > 170) {
        x = marginX
        y += imgSize + 6
      }
    }
  }

  doc.save(`SaleOrder-${order.billNo}.pdf`)
}


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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 mb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/20 text-gray-700 hover:shadow-md hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Orders</span>
        </button>

        {/* CONVERT TO SALE SECTION */}
<div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
  <div className="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h2 className="text-xl font-bold text-gray-800">
        Convert to Sale
      </h2>

      {order.converted ? (
        <p className="text-sm text-emerald-600 mt-1 font-medium">
          Converted to Sale on{" "}
          {new Date(order.convertedAt).toLocaleString()}
        </p>
      ) : (
        <p className="text-sm text-gray-500 mt-1">
          This sale order has not been converted yet
        </p>
      )}
    </div>

    {!order.converted && (
      <button
        onClick={handleConvertToSale}
        disabled={converting}
        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700
          hover:from-emerald-700 hover:to-emerald-800
          text-white rounded-xl font-semibold shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 transition-all"
      >
        {converting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            Convert to Sale
          </>
        )}
      </button>
    )}
  </div>

  {convertError && (
    <div className="mt-4 flex items-center gap-2 text-red-600 text-sm font-medium">
      <AlertCircle className="w-4 h-4" />
      {convertError}
    </div>
  )}
</div>



        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <FileText className="text-white" size={24} />
            </div>
            <div className="flex justify-between w-full">
              <span>
 <h1 className="text-3xl font-bold text-gray-800">Sale Order #{order.billNo}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Order Details</p>
              </span>
             
              <button
  onClick={generateSaleOrderPDF}
  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600
    hover:from-blue-700 hover:to-indigo-700
    text-white rounded-xl font-semibold shadow-lg
    flex items-center gap-2 transition-all"
>
  <FileText className="w-5 h-5" />
  Download PDF
</button>

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
