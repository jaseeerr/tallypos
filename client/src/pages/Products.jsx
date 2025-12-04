import React, { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { API_BASE } from "../utils/url";
import { Pencil } from "lucide-react"; // Edit icon

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ========= FETCH INVENTORY =========
  const fetchInventory = async () => {
    try {
      setLoading(true);

      const query =
        activeCompany !== "ALL"
          ? `?companyName=${encodeURIComponent(activeCompany)}`
          : "";

      const res = await axios.get(`${API_BASE}/inventory${query}`);
      setInventory(res.data.items || []);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [activeCompany]);

  // ========= FILTER =========
  const filteredList = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemGroup?.toLowerCase().includes(q)
    );
  });

  // ========= QR Download =========
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
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);
      ctx.font = "18px Arial";
      ctx.fillStyle = "#000";
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

  // ========= OPEN MODAL =========
  const openModal = (item) => {
    setModalItem(item);
    setSelectedFile(null);
    setPreview(item.imageUrl ? `${API_BASE}${item.imageUrl}` : null);
    setModalOpen(true);
  };

  // ========= HANDLE FILE SELECT =========
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // ========= UPLOAD IMAGE =========
  const handleUpload = async () => {
    if (!selectedFile) return alert("Select an image first!");

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);

      await axios.put(
        `${API_BASE}/inventory/update-image/${modalItem._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setUploading(false);
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error("Image upload error:", err);
      setUploading(false);
    }
  };

  // ========= REMOVE IMAGE =========
  const handleRemoveImage = async () => {
    try {
      setUploading(true);

      await axios.put(
        `${API_BASE}/inventory/remove-image/${modalItem._id}`
      );

      setUploading(false);
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error("Remove image error:", err);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Inventory</h2>

        <div className="flex gap-2 mt-3 sm:mt-0">
          {["ALL", "ABC", "XYZ"].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCompany(c)}
              className={`px-4 py-2 rounded-md border font-semibold transition ${
                activeCompany === c
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Search ===== */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 w-64"
        />

        <button
          onClick={fetchInventory}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* ===== TABLE ===== */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-sm border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">QR</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-center">Edit</th>
              </tr>
            </thead>

            <tbody>
              {filteredList.map((item) => (
                <tr key={item._id} className="border-t hover:bg-gray-50">

                  {/* IMAGE */}
                  <td className="p-3 text-center">
                    {item.imageUrl ? (
                      <img
                        src={`${API_BASE}${item.imageUrl}`}
                        className="h-14 w-14 object-cover rounded mx-auto"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </td>

                  {/* QR */}
                  <td className="p-3 text-center">
                    <div
                      className="cursor-pointer inline-block"
                      onDoubleClick={(e) =>
                        handleQRDownload(
                          e.currentTarget.querySelector("svg"),
                          item.itemCode || item.itemName,
                          item.itemName
                        )
                      }
                    >
                      <QRCode value={item.itemName} size={70} />
                      <p className="text-xs">{item.itemName}</p>
                    </div>
                  </td>

                  {/* INFO */}
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3">{item.itemCode}</td>
                  <td className="p-3 text-right">{item.availableQty}</td>

                  {/* EDIT ICON */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Pencil size={18} />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================= IMAGE EDIT MODAL ======================= */}
      {modalOpen && modalItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md relative">

            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h3 className="text-xl font-semibold mb-4">
              Edit Image – {modalItem.itemName}
            </h3>

            {/* Preview */}
            <div className="w-full flex justify-center mb-4">
              {preview ? (
                <img
                  src={preview}
                  className="h-40 w-40 object-cover rounded border"
                />
              ) : (
                <div className="h-40 w-40 border rounded flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>

            {/* Select File */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="border p-2 rounded w-full mb-4"
            />

            {/* Buttons */}
            <div className="flex justify-between">

              {/* REMOVE IMAGE */}
              {modalItem.imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  disabled={uploading}
                >
                  Remove Image
                </button>
              )}

              {/* UPLOAD IMAGE */}
              <button
                onClick={handleUpload}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-auto"
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
