"use client"

import { useEffect, useRef, useState } from "react"
import MyAxiosInstance from "../utils/axios"
import { useNavigate } from "react-router-dom"

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
  }, [companyName, search])

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
      { rootMargin: "200px" }
    )

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, page])

  // =============================
  // RENDER
  // =============================
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sale Orders</h1>

        <div className="flex gap-3">
          <select
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="ABC">ABC</option>
            <option value="FANCY-PALACE-TRADING-LLC">Fancy Palace</option>
            <option value="ALL">All</option>
          </select>

          <input
            type="text"
            placeholder="Search bill, party, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded-lg w-64"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Bill No</th>
              <th className="px-4 py-3 text-left text-sm">Party</th>
              <th className="px-4 py-3 text-left text-sm">Date</th>
              <th className="px-4 py-3 text-right text-sm">Total</th>
            </tr>
          </thead>
         <tbody>
  {orders.map((order) => (
    <tr
      key={order._id}
      onClick={() => goToOrder(order._id)}
      className="cursor-pointer hover:bg-blue-50 transition-colors"
    >
      <td>{order.billNo}</td>
      <td>{order.partyName || "-"}</td>
      <td>{new Date(order.date).toLocaleDateString()}</td>
      <td>AED {Number(order.totalAmount || 0).toFixed(2)}</td>
    </tr>
  ))}
</tbody>

        </table>

        {/* EMPTY STATE */}
        {!loading && orders.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No sale orders found
          </div>
        )}
      </div>

      {/* LOADING / ERROR */}
      {loading && (
        <div className="text-center py-4 text-gray-500">
          Loading more orders...
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-red-500">
          {error}
        </div>
      )}

      {/* SENTINEL */}
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}
