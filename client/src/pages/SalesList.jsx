import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchSales = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      if (companyName) params.companyName = companyName;
      if (search) params.search = search;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await axios.get(`${API_BASE}/list-sales`, { params });

      setSales(res.data.sales || []);
      setTotal(res.data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching sales:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page]);

  // Format status badge
  const statusBadge = (status) => {
    const classes = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      synced: "bg-green-100 text-green-700",
      error: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-3 py-1 rounded text-xs font-semibold ${classes[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Sales</h2>

      {/* FILTER BAR */}
      <div className="grid md:grid-cols-5 gap-4 mb-6">

        <input
          type="text"
          placeholder="Search bill No, customer, etc..."
          className="border p-2 rounded col-span-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="text"
          placeholder="Company Name"
          className="border p-2 rounded"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <button
          onClick={() => { setPage(1); fetchSales(); }}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
        >
          Filter
        </button>
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="text-gray-600">Loading sales...</p>
      ) : sales.length === 0 ? (
        <p className="text-gray-600">No sales found.</p>
      ) : (
        <div className="overflow-x-auto border rounded-md shadow bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Bill No</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Customer / Cash</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{sale.billNo}</td>
                  <td className="p-3">{sale.companyName}</td>

                  <td className="p-3">
                    {sale.isCashSale
                      ? sale.cashLedgerName || "Cash Sale"
                      : sale.partyName || "—"}
                  </td>

                  <td className="p-3">
                    {new Date(sale.date).toLocaleDateString()}
                  </td>

                  <td className="p-3 text-right font-semibold">
                    {sale.totalAmount?.toFixed(2)}
                  </td>

                  <td className="p-3 text-center">{statusBadge(sale.status)}</td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => location.href=`/sale/${sale.billNo}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      {total > limit && (
        <div className="flex justify-between items-center mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className={`px-4 py-2 rounded border ${
              page <= 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Previous
          </button>

          <span className="text-gray-600">
            Page {page} of {Math.ceil(total / limit)}
          </span>

          <button
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage(page + 1)}
            className={`px-4 py-2 rounded border ${
              page >= Math.ceil(total / limit)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
