import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
import QRBarcodeScanner from "react-qr-barcode-scanner"; // ← NEW SCANNER

export default function CreateSaleOrder() {
  const [activeCompany, setActiveCompany] = useState("ABC");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [scannedData, setScannedData] = useState(null);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // ---- FETCH PRODUCT ----
  const fetchProduct = async (name) => {
    try {
      setLoadingProduct(true);
      setProduct(null);

      const res = await axios.get(`${API_BASE}/getProductByName`, {
        params: {
          name,
          companyName: activeCompany,
        },
      });

      setProduct(res.data.item);
    } catch (err) {
      console.error("Error fetching product:", err);
      setProduct(null);
    }

    setLoadingProduct(false);
  };

  // ---- HANDLE SCAN RESULT ----
  const handleScan = (data) => {
    if (!data?.text) return;

    const text = data.text;
    console.log("📦 SCANNED:", text);

    // prevent duplicate fetches
    if (text !== scannedData) {
      setScannedData(text);
      fetchProduct(text);
    }
  };

  const handleError = (err) => {
    console.error("Scanner error:", err);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* TITLE */}
      <h2 className="text-3xl font-bold mb-6">Create Sale Order</h2>

      {/* COMPANY SELECTOR */}
      <div className="flex gap-4 mb-6">
        {["ABC", "XYZ"].map((comp) => (
          <button
            key={comp}
            onClick={() => setActiveCompany(comp)}
            className={`px-4 py-2 rounded-md font-semibold border transition ${
              activeCompany === comp
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {comp}
          </button>
        ))}
      </div>

      {/* OPEN SCANNER BUTTON */}
      <button
        onClick={() => {
          setScannerOpen(true);
          setProduct(null);
          setScannedData(null);
        }}
        className="bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700"
      >
        Open QR/Barcode Scanner
      </button>

      {/* SCANNER MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white p-5 rounded-lg w-full max-w-md relative">

            {/* CLOSE BUTTON */}
            <button
              onClick={() => {
                setScannerOpen(false);
              }}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h3 className="text-lg font-semibold mb-4">Scan Code</h3>

            {/* CAMERA SCANNER */}
            <div className="w-full h-64 overflow-hidden rounded border bg-black">
              <QRBarcodeScanner
                onUpdate={(err, data) => {
                  if (err) handleError(err);
                  if (data) handleScan(data);
                }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* PRODUCT STATUS */}
            {loadingProduct && (
              <p className="text-gray-600 text-center mt-3">Searching...</p>
            )}

            {/* PRODUCT FOUND */}
            {product && (
              <div className="border rounded p-4 mt-4 bg-gray-50">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">
                  Product Found
                </h4>

                <p><strong>Name:</strong> {product.itemName}</p>
                <p><strong>Code:</strong> {product.itemCode}</p>
                <p><strong>Available Qty:</strong> {product.availableQty}</p>
                <p><strong>Rate:</strong> {product.avgRate}</p>

                {product.imageUrl && (
                  <img
                    src={`${API_BASE}/${product.imageUrl}`}
                    alt="product"
                    className="h-24 w-24 object-cover mt-3 rounded"
                  />
                )}
              </div>
            )}

            {/* PRODUCT NOT FOUND */}
            {!loadingProduct && scannedData && !product && (
              <p className="text-red-600 text-center mt-4">
                No product found for:
                <br />
                <span className="font-bold">{scannedData}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
