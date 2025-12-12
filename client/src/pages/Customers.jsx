import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
import MyAxiosInstance from "../utils/axios";

export default function Customers() {
  const axiosInstance = MyAxiosInstance()
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  // ============================
  // FETCH CUSTOMERS
  // ============================
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(`/customers`, {
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

      {/* ============================
          FILTERS
      ============================ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        
        <input
          type="text"
          placeholder="Search name, group, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-72"
        />

        <select
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={handleSearch}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-60"
        >
          <option value="">All Companies</option>
          <option value="ABC">ABC</option>
          <option value="XYZ">XYZ</option>
        </select>

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

      {/* ============================
          LOADING
      ============================ */}
      {loading && <p className="text-gray-600">Loading customers...</p>}

      {/* ============================
          NO RESULTS
      ============================ */}
      {!loading && customers.length === 0 && (
        <p className="text-gray-600">No customers found.</p>
      )}

      {/* ============================
          TABLE
      ============================ */}
      {!loading && customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Last Sync</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((cust) => (
                <tr
                  key={cust._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{cust.name}</td>
                  <td className="p-3">{cust.group}</td>

                  <td className="p-3">
                    {cust.address && cust.address.length > 0
                      ? cust.address.join(", ")
                      : "-"}
                  </td>

                  <td className="p-3">{cust.companyName || "-"}</td>

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

      {/* ============================
          PAGINATION
      ============================ */}
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
