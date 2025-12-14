import React, { useEffect, useState } from "react";
import axios from "axios";
import QRBarcodeScanner from "react-qr-barcode-scanner";
import { API_BASE } from "../utils/url";
import MyAxiosInstance from "../utils/axios";
export default function CreateSaleOrder() {
  const axiosInstance = MyAxiosInstance()
  const [activeCompany, setActiveCompany] = useState("ABC");

  /* =======================
     CUSTOMER STATE
  ======================= */
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  /* =======================
     PRODUCT STATE
  ======================= */
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [items, setItems] = useState([]);

  /* =======================
     SCANNER STATE
  ======================= */
  const [scannerOpen, setScannerOpen] = useState(false);
  const [autoAdd, setAutoAdd] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);

  /* =======================
     FETCH CUSTOMERS
  ======================= */
  useEffect(() => {
    if (!customerSearch) return;

    const fetchCustomers = async () => {
      const res = await axiosInstance.get(`${API_BASE}/customers`, {
        params: {
          search: customerSearch,
          companyName: activeCompany,
        },
      });

      if (res.data.ok) setCustomers(res.data.items);
    };

    fetchCustomers();
  }, [customerSearch, activeCompany]);

  /* =======================
     FETCH PRODUCTS (SEARCH)
  ======================= */
  useEffect(() => {
    if (!productSearch) return;

    const fetchProducts = async () => {
      const res = await axiosInstance.get(`/inventory`, {
        params: {
          search: productSearch,
          companyName: activeCompany,
        },
      });

      if (res.data.ok) setProducts(res.data.items);
    };

    fetchProducts();
  }, [productSearch, activeCompany]);

  /* =======================
     FETCH PRODUCT BY ID
  ======================= */
  const fetchProductById = async (id) => {
    try {
      setLoadingProduct(true);
      setSelectedProduct(null);

      const res = await axiosInstance.post(
        `${API_BASE}/inventory/${id}`,
        { companyName: activeCompany }
      );

      if (res.data.ok) {
        const prod = res.data.product;
        setSelectedProduct(prod);

        if (autoAdd && !prod.disable) {
          addItem(prod);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProduct(false);
    }
  };

  /* =======================
     ADD ITEM TO LIST
  ======================= */
  const addItem = (prod) => {
    setItems((prev) => [
      ...prev,
      {
        productId: prod._id,
        name: prod.NAME,
        group: prod.GROUP,
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
    setSelectedProduct(null);
    setScannerOpen(false);
  };

  /* =======================
     SCAN HANDLER
  ======================= */
  const handleScan = (data) => {
    if (data?.text) {
      fetchProductById(data.text.trim());
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-3xl font-bold">Create Sale Order</h2>

      {/* =======================
         COMPANY SELECT
      ======================= */}
      <div className="flex gap-3">
        {["ABC", "FANCY-PALACE-TRADING-LLC"].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCompany(c)}
            className={`px-4 py-2 rounded ${
              activeCompany === c
                ? "bg-blue-600 text-white"
                : "border"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* =======================
         CUSTOMER SEARCH
      ======================= */}
      <div>
        <label className="font-semibold">Customer</label>
        <input
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Search customer..."
          className="w-full border p-2 rounded"
        />

        {customers.length > 0 && (
          <div className="border mt-2 rounded bg-white max-h-40 overflow-auto">
            {customers.map((c) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setCustomerSearch(c.name);
                  setCustomers([]);
                }}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {c.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =======================
         PRODUCT SEARCH
      ======================= */}
      <div>
        <label className="font-semibold">Product</label>
        <div className="flex gap-2">
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search product..."
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={() => setScannerOpen(true)}
            className="bg-green-600 text-white px-4 rounded"
          >
            Scan QR
          </button>
        </div>

        {products.length > 0 && (
          <div className="border mt-2 rounded bg-white max-h-40 overflow-auto">
            {products.map((p) => (
              <div
                key={p._id}
                onClick={() => fetchProductById(p._id)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {p.NAME} ({p.GROUP})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =======================
         ITEMS LIST
      ======================= */}
      <div>
        <h3 className="font-semibold mb-2">Items</h3>
        {items.length === 0 && (
          <p className="text-gray-500">No items added</p>
        )}

        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 mb-2">
            <input value={item.name} disabled className="border p-2" />
            <input
              type="number"
              value={item.qty}
              onChange={(e) => {
                const qty = Number(e.target.value);
                setItems((prev) =>
                  prev.map((it, idx) =>
                    idx === i
                      ? {
                          ...it,
                          qty,
                          amount: qty * it.rate,
                        }
                      : it
                  )
                );
              }}
              className="border p-2"
            />
            <input
              type="number"
              value={item.rate}
              onChange={(e) => {
                const rate = Number(e.target.value);
                setItems((prev) =>
                  prev.map((it, idx) =>
                    idx === i
                      ? {
                          ...it,
                          rate,
                          amount: rate * it.qty,
                        }
                      : it
                  )
                );
              }}
              className="border p-2"
            />
            <input value={item.amount} disabled className="border p-2" />
            <button
              onClick={() =>
                setItems((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="text-red-600"
            >
              ✖
            </button>
          </div>
        ))}
      </div>

      {/* =======================
         SCANNER MODAL
      ======================= */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-semibold mb-2">Scan Product</h3>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={autoAdd}
                onChange={() => setAutoAdd(!autoAdd)}
              />
              Auto add to items
            </label>

            <QRBarcodeScanner
              onUpdate={(err, data) => {
                if (data) handleScan(data);
              }}
              style={{ width: "100%" }}
            />

            {loadingProduct && <p>Loading...</p>}

            {selectedProduct && !autoAdd && (
              <div className="mt-3 border p-3 rounded">
                <p><b>Name:</b> {selectedProduct.NAME}</p>
                <p><b>Group:</b> {selectedProduct.GROUP}</p>
                <p><b>Company:</b> {selectedProduct.companyName}</p>

                <button
                  disabled={selectedProduct.disable}
                  onClick={() => addItem(selectedProduct)}
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                >
                  Add Item
                </button>
              </div>
            )}

            <button
              onClick={() => setScannerOpen(false)}
              className="mt-3 text-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
