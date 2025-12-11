import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
import QRBarcodeScanner from "react-qr-barcode-scanner";

export default function CreateSaleOrder() {
  const [activeCompany, setActiveCompany] = useState("ABC");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [scannedValue, setScannedValue] = useState(null);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // ---- FETCH PRODUCT USING NEW API ----
  const fetchProduct = async (itemName) => {
    try {
      setLoadingProduct(true);
      setProduct(null);

      const res = await axios.get(`${API_BASE}/getProductBasic`, {
        params: {
          companyName: activeCompany,
          itemName,
        },
      });

      if (res.data.ok) {
        setProduct(res.data.item);
      } else {
        setProduct(null);
      }
    } catch (err) {
      console.error("Fetch product error:", err);
      setProduct(null);
    }

    setLoadingProduct(false);
  };

  // ---- HANDLE SCAN RESULT ----
  const handleScan = (data) => {
    if (!data?.text) return;

    const text = data.text.trim();
    console.log("📦 SCANNED:", text);

    if (text !== scannedValue) {
      setScannedValue(text);
      fetchProduct(text);
    }
  };

  const handleError = (err) => {
    console.error("Scanner Error:", err);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* PAGE TITLE */}
      <h2 className="text-3xl font-bold mb-6">Create Sale Order</h2>

      {/* COMPANY SELECTOR */}
      <div className="flex gap-4 mb-6">
        {["ABC", "FANCY-PALACE-TRADING-LLC"].map((comp) => (
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

      {/* OPEN SCANNER */}
      <button
        onClick={() => {
          setScannerOpen(true);
          setScannedValue(null);
          setProduct(null);
        }}
        className="bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700"
      >
        Open QR Scanner
      </button>

      {/* CAMERA MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white p-5 rounded-lg w-full max-w-md relative">

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setScannerOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h3 className="text-lg font-semibold mb-4">Scan Product QR</h3>

            {/* SCANNER COMPONENT */}
            <div className="w-full h-64 bg-black rounded overflow-hidden border">
              <QRBarcodeScanner
                onUpdate={(err, data) => {
                  if (err) handleError(err);
                  if (data) handleScan(data);
                }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* LOADING */}
            {loadingProduct && (
              <p className="text-center text-gray-600 mt-3">Searching...</p>
            )}

            {/* PRODUCT FOUND */}
            {product && (
              <div className="mt-4 bg-gray-50 border rounded p-4">
                <h4 className="font-semibold text-lg mb-2 text-gray-800">
                  Product Found
                </h4>

                <p><strong>Name:</strong> {product.itemName}</p>
                <p><strong>Code:</strong> {product.itemCode}</p>
                <p><strong>Available Qty:</strong> {product.availableQty}</p>
                <p><strong>Opening Qty:</strong> {product.openingQty}</p>
                <p><strong>Closing Qty:</strong> {product.closingQty}</p>

                {product.imageUrl && (
                  <img
                    src={`${API_BASE}${product.imageUrl}`}
                    alt="product"
                    className="h-24 w-24 rounded mt-3 object-cover"
                  />
                )}
              </div>
            )}

            {/* PRODUCT NOT FOUND */}
            {!loadingProduct && scannedValue && !product && (
              <p className="text-red-600 text-center mt-4">
                No product found for:
                <br />
                <span className="font-bold">{scannedValue}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
