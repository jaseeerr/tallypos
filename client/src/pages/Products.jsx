import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Barcode from "react-barcode";
import { API_BASE } from "../utils/url";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  // Fetch inventory
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

  // Filter list
  const filteredList = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemGroup?.toLowerCase().includes(q)
    );
  });

  // ⬇️ DOWNLOAD BARCODE AS PNG
const handleBarcodeDownload = (svgElement, fileName, labelText) => {
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = function () {
    // Create canvas with extra height for text
    const canvas = document.createElement("canvas");
    const padding = 10;
    const textHeight = 22;
    canvas.width = img.width + padding * 2;
    canvas.height = img.height + textHeight + padding * 2;

    const ctx = canvas.getContext("2d");

    // WHITE BACKGROUND
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw barcode centered
    const barcodeX = (canvas.width - img.width) / 2;
    ctx.drawImage(img, barcodeX, padding);

    // Draw product name text below
    ctx.fillStyle = "#000000";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(labelText, canvas.width / 2, img.height + padding + textHeight - 5);

    // Convert to PNG & download
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${fileName}.png`;
    link.click();

    URL.revokeObjectURL(url);
  };

  img.src = url;
};


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-semibold text-gray-800 mb-3 sm:mb-0">
          Inventory
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Filter by company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />

          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />

          <button
            onClick={fetchInventory}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="text-gray-600">Loading inventory...</p>
      ) : filteredList.length === 0 ? (
        <p className="text-gray-600">No inventory items found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow border border-gray-200 rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Barcode</th>
                <th className="p-3 text-left">Item Name</th>
                <th className="p-3 text-left">Item Code</th>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-right">Available Qty</th>
                <th className="p-3 text-right">Closing Qty</th>
                <th className="p-3 text-right">Avg Rate</th>
                <th className="p-3">Godowns</th>
              </tr>
            </thead>

            <tbody>
              {filteredList.map((item) => (
                <tr key={item._id} className="border-t hover:bg-gray-50">
                  {/* PRODUCT IMAGE */}
                  <td className="p-3">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}${item.imageUrl}`}
                        alt={item.itemName}
                        className="h-14 w-14 object-cover rounded"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </td>

                  {/* BARCODE */}
                  <td className="p-3 text-center">
                    <div
                      className="cursor-pointer inline-block"
                     onDoubleClick={(e) =>
  handleBarcodeDownload(
    e.currentTarget.querySelector("svg"),
    item.itemCode || item.itemName,
    item.itemName   // 👈 this is the label shown in the PNG
  )
}

                    >
                      <Barcode
                        value={item.itemName}
                        format="CODE128"
                        width={1.4}
                        height={40}
                        displayValue={false}
                      />

                      {/* BARCODE VALUE BELOW */}
                      <div className="text-xs text-gray-700 mt-1 font-medium">
                        {item.itemName}
                      </div>
                    </div>
                  </td>

                  {/* OTHER FIELDS */}
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3">{item.itemCode}</td>
                  <td className="p-3">{item.itemGroup || "-"}</td>
                  <td className="p-3 text-right">{item.availableQty ?? "-"}</td>
                  <td className="p-3 text-right">{item.closingQty ?? "-"}</td>
                  <td className="p-3 text-right">
                    {item.avgRate?.toFixed(2) ?? "-"}
                  </td>

                  <td className="p-3">
                    {Array.isArray(item.godowns) && item.godowns.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs">
                        {item.godowns.map((g, i) => (
                          <li key={i}>{g.name}: {g.qty}</li>
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
