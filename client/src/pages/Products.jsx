import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState(""); // optional filter

  // Fetch inventory from backend
  const fetchInventory = async () => {
    try {
      setLoading(true);

      const query = companyName
        ? `?companyName=${encodeURIComponent(companyName)}`
        : "";

      const res = await axios.get(`${API_BASE}/inventory${query}`);

      setInventory(res.data.items || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [companyName]);

  // Filter inventory based on search
  const filteredList = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemGroup?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-semibold text-gray-800 mb-3 sm:mb-0">
          Inventory
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Filter */}
          <input
            type="text"
            placeholder="Filter by company (optional)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 outline-none"
          />

          {/* Search */}
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 outline-none"
          />

          {/* Refresh button */}
          <button
            onClick={fetchInventory}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE / LIST */}
      {loading ? (
        <p className="text-gray-600">Loading inventory...</p>
      ) : filteredList.length === 0 ? (
        <p className="text-gray-600">No inventory items found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow border border-gray-200 rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Item Name</th>
                <th className="p-3 text-left">Item Code</th>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-right">Opening Qty</th>
                <th className="p-3 text-right">Available Qty</th>
                <th className="p-3 text-right">Closing Qty</th>
                <th className="p-3 text-right">Avg Rate</th>
                <th className="p-3 text-right">Closing Value</th>
                <th className="p-3">Godowns</th>
              </tr>
            </thead>

            <tbody>
              {filteredList.map((item) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3">{item.itemCode}</td>
                  <td className="p-3">{item.itemGroup || "-"}</td>
                  <td className="p-3">{item.unit}</td>

                  <td className="p-3 text-right">{item.openingQty ?? "-"}</td>
                  <td className="p-3 text-right">
                    {item.availableQty ?? "-"}
                  </td>
                  <td className="p-3 text-right">{item.closingQty ?? "-"}</td>

                  <td className="p-3 text-right">
                    {item.avgRate?.toFixed(2) ?? "-"}
                  </td>
                  <td className="p-3 text-right">
                    {item.closingValue?.toFixed(2) ?? "-"}
                  </td>

                  <td className="p-3">
                    {Array.isArray(item.godowns) && item.godowns.length > 0 ? (
                      <ul className="list-disc pl-5 text-gray-700 text-xs">
                        {item.godowns.map((g, idx) => (
                          <li key={idx}>
                            {g.name}: {g.qty}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
