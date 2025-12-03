import React, { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { API_BASE } from "../utils/url";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeCompany, setActiveCompany] = useState("ALL");

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);

      const query =
        activeCompany !== "ALL"
          ? `?companyName=${encodeURIComponent(activeCompany)}`
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
  }, [activeCompany]);

  // Filter list
  const filteredList = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemGroup?.toLowerCase().includes(q)
    );
  });

  // ⬇️ DOWNLOAD QR CODE AS PNG
  const handleQRDownload = (svgElement, fileName, label) => {
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const padding = 15;
      const textHeight = 24;

      canvas.width = img.width + padding * 2;
      canvas.height = img.height + textHeight + padding * 2;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, padding, padding);

      ctx.font = "18px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(label, canvas.width / 2, img.height + padding + textHeight);

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

      {/* ===== PAGE HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-semibold text-gray-800 mb-3 sm:mb-0">
          Inventory
        </h2>

        {/* ===== COMPANY SELECTOR BUTTONS ===== */}
        <div className="flex gap-2">
          {["ALL", "ABC", "XYZ"].map((company) => (
            <button
              key={company}
              onClick={() => setActiveCompany(company)}
              className={`px-4 py-2 rounded-md border font-semibold transition ${
                activeCompany === company
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {company}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SEARCH BAR ===== */}
      <div className="flex sm:flex-row flex-col gap-3 mb-6">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-64"
        />

        <button
          onClick={fetchInventory}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* ===== TABLE ===== */}
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
                <th className="p-3 text-center">QR Code</th>
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

                  {/* QR CODE */}
                  <td className="p-3 text-center">
                    <div
                      className="inline-block cursor-pointer"
                      onDoubleClick={(e) =>
                        handleQRDownload(
                          e.currentTarget.querySelector("svg"),
                          item.itemCode || item.itemName,
                          item.itemName
                        )
                      }
                    >
                      <QRCode value={item.itemName} size={70} level="M" />
                      <div className="text-xs mt-1">{item.itemName}</div>
                    </div>
                  </td>

                  {/* OTHER INFO */}
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3">{item.itemCode}</td>
                  <td className="p-3">{item.itemGroup || "-"}</td>
                  <td className="p-3 text-right">{item.availableQty ?? "-"}</td>
                  <td className="p-3 text-right">{item.closingQty ?? "-"}</td>
                  <td className="p-3 text-right">
                    {item.avgRate?.toFixed(2) ?? "-"}
                  </td>

                  <td className="p-3">
                    {item.godowns?.length > 0 ? (
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
