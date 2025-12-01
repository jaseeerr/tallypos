import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/customers`, {
        params: {
          search,
          companyName,
          page,
          limit,
        },
      });

      setCustomers(res.data.customers || []);
      setTotal(res.data.total || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error loading customers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchCustomers();
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Customers</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, code, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-72"
        />

        <input
          type="text"
          placeholder="Filter by company (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={handleSearch}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-60"
        />

        <button
          onClick={() => {
            setPage(1);
            fetchCustomers();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Apply
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-gray-600">Loading customers...</p>
      )}

      {/* No results */}
      {!loading && customers.length === 0 && (
        <p className="text-gray-600">No customers found.</p>
      )}

      {/* Table */}
      {!loading && customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Party Code</th>
                <th className="p-3 text-left">Customer Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Ledger</th>
                <th className="p-3 text-left">Last Sync</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((cust) => (
                <tr
                  key={cust._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{cust.partyCode || "-"}</td>
                  <td className="p-3">{cust.partyName}</td>
                  <td className="p-3">{cust.phone || "-"}</td>
                  <td className="p-3">{cust.email || "-"}</td>
                  <td className="p-3">{cust.companyName}</td>
                  <td className="p-3">{cust.ledgerName || "-"}</td>
                  <td className="p-3 text-gray-500">
                    {cust.lastSyncedAt
                      ? new Date(cust.lastSyncedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>

          <span className="text-gray-700">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
