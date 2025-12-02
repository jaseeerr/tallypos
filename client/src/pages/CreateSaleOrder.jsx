import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

export default function CreateSaleOrder() {
  const [activeCompany, setActiveCompany] = useState("ABC");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Call API to fetch product
  const fetchProduct = async (name) => {
    try {
      setLoadingProduct(true);
      const res = await axios.get(`${API_BASE}/getProductByName`, {
        params: {
          name,
          companyName: activeCompany,
        },
      });

      setProduct(res.data.item);
      setLoadingProduct(false);
    } catch (err) {
      console.error("Error fetching product:", err);
      setProduct(null);
      setLoadingProduct(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* TITLE */}
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Create Sale Order</h2>

      {/* COMPANY SELECTOR */}
      <div className="flex gap-4 mb-6">
        {["ABC", "XYZ"].map((comp) => (
          <button
            key={comp}
            onClick={() => setActiveCompany(comp)}
            className={`px-4 py-2 rounded-md font-semibold border transition
              ${activeCompany === comp
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
        Open Scanner
      </button>

      {/* SCANNER MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md relative">

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setScannerOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h3 className="text-lg font-semibold mb-4">Scan Barcode</h3>

            {/* BARCODE SCANNER */}
            <div className="w-full h-64 border rounded overflow-hidden mb-4">
              <BarcodeScannerComponent
                width={"100%"}
                height={"100%"}
                onUpdate={(err, result) => {
                  if (result) {
                    const text = result.text;
                    if (text !== scannedData) {
                      setScannedData(text);
                      fetchProduct(text);
                    }
                  }
                }}
              />
            </div>

            {/* SCANNED PRODUCT INFORMATION */}
            {loadingProduct && (
              <p className="text-gray-600 text-center">Fetching product...</p>
            )}

            {product && (
              <div className="border rounded p-3 bg-gray-50">
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
                    className="h-24 w-24 mt-3 rounded object-cover"
                  />
                )}
              </div>
            )}

            {!loadingProduct && scannedData && !product && (
              <p className="text-red-600 text-center mt-3">
                No product found for barcode:
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
