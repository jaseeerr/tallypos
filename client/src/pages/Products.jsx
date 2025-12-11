import React, { useEffect, useState, useRef, useCallback } from "react";
import QRCode from "react-qr-code";
import { Pencil } from "lucide-react";
import MyAxiosInstance from "../utils/axios";
import { API_BASE } from "../utils/url";

export default function InventoryPage() {
  const axiosInstance = MyAxiosInstance();

  // =====================
  // STATE
  // =====================
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCompany, setActiveCompany] = useState("ALL");
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loaderRef = useRef(null);

  // =====================
  // PARSE STOCK STRING → PIECES
  // =====================
  const parseStockToPieces = (str) => {
    if (!str || typeof str !== "string") return 0;

    const UNIT_MAP = {
      doz: 12,
      dozen: 12,
      pc: 1,
      pcs: 1,
      piece: 1,
      pieces: 1,
      gross: 144,
    };

    const lower = str.toLowerCase();
    const regex = /(\d+)\s*(doz|dozen|pc|pcs|piece|pieces|gross)/g;

    let total = 0;
    let match;

    while ((match = regex.exec(lower)) !== null) {
      const qty = parseInt(match[1]);
      const unit = match[2];
      total += qty * (UNIT_MAP[unit] || 1);
    }

    return total;
  };

  // =====================
  // FETCH INVENTORY (PAGINATED)
  // =====================
  const fetchInventory = async (reset = false) => {
    if (loading) return;

    try {
      setLoading(true);

      const res = await axiosInstance.get("/inventory", {
        params: {
          companyName: activeCompany,
          search: searchQuery,
          page: reset ? 1 : page,
          limit: 100,
        },
      });

      const newItems = res.data.items || [];

      if (reset) {
        setInventory(newItems);
        setPage(2);
      } else {
        setInventory((prev) => [...prev, ...newItems]);
        setPage((prev) => prev + 1);
      }

      setHasMore(newItems.length > 0);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    }

    setLoading(false);
  };

  // =====================
  // RESET & RELOAD ON FILTERS
  // =====================
  useEffect(() => {
    setInventory([]);
    setPage(1);
    setHasMore(true);
    fetchInventory(true);
  }, [activeCompany, searchQuery]);

  // =====================
  // INFINITE SCROLL OBSERVER
  // =====================
  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        fetchInventory();
      }
    },
    [hasMore, loading]
  );

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [handleObserver]);

  // =====================
  // FILTER FRONTEND (OUT-OF-STOCK)
  // =====================
  const filteredList = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const stock = parseStockToPieces(item.CLOSINGQTY);

    const matches =
      item.NAME?.toLowerCase().includes(q) ||
      item.GROUP?.toLowerCase().includes(q);

    if (!includeOutOfStock && stock <= 0) return false;

    return matches;
  });

  // =====================
  // QR DOWNLOAD
  // =====================
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
      ctx.fillStyle = "#fff";
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

  // =====================
  // IMAGE MODAL FUNCTIONS
  // =====================
  const openModal = (item) => {
    setModalItem(item);
    setSelectedFile(null);
    setPreview(item.imageUrl ? `${API_BASE}${item.imageUrl}` : null);
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Select an image first!");

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);

      await axiosInstance.put(`/inventory/update-image/${modalItem._id}`, formData);

      setUploading(false);
      setModalOpen(false);
      fetchInventory(true);
    } catch (err) {
      console.error("Image upload error:", err);
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      await axiosInstance.put(`/inventory/remove-image/${modalItem._id}`);
      setUploading(false);
      setModalOpen(false);
      fetchInventory(true);
    } catch (err) {
      console.error("Remove image error:", err);
      setUploading(false);
    }
  };

  // =====================
  // RENDER UI
  // =====================
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ===================== Header ===================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Inventory</h2>

        <div className="flex gap-2 mt-3 sm:mt-0">
          {["ALL", "AMANA", "FANCY-PALACE-TRADING-LLC"].map((c) => (
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

      {/* ===================== Search + Out-of-stock ===================== */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 w-64"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeOutOfStock}
            onChange={(e) => setIncludeOutOfStock(e.target.checked)}
          />
          Show Out-of-Stock
        </label>
      </div>

      {/* ===================== Table ===================== */}
      <div className="overflow-x-auto bg-white shadow-sm border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">QR</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Group</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-center">Edit</th>
            </tr>
          </thead>

          <tbody>
            {filteredList.map((item) => (
              <tr key={item._id} className="border-t hover:bg-gray-50">

                {/* Image */}
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
                        item.NAME,
                        item.NAME
                      )
                    }
                  >
                    <QRCode value={String(item.NAME || "ITEM")} size={70} />
                  </div>
                </td>

                {/* NAME */}
                <td className="p-3">{item.NAME}</td>

                {/* GROUP */}
                <td className="p-3">{item.GROUP || "-"}</td>

                {/* QTY */}
                <td
                  className="p-3 text-right"
                  title={`${parseStockToPieces(item.CLOSINGQTY)} pcs`}
                >
                  {item.CLOSINGQTY}
                </td>

                {/* EDIT */}
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

        {/* Infinite Scroll Loading Indicator */}
        <div ref={loaderRef} className="py-6 text-center text-gray-500">
          {loading && "Loading..."}
        </div>
      </div>

      {/* ===================== IMAGE MODAL ===================== */}
      {modalOpen && modalItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h3 className="text-xl font-semibold mb-4">
              Edit Image – {modalItem.NAME}
            </h3>

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

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="border p-2 rounded w-full mb-4"
            />

            <div className="flex justify-between">
              {modalItem.imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  disabled={uploading}
                >
                  Remove Image
                </button>
              )}

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
