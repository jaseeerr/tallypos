import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function AddSale() {
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const [activeCompany, setActiveCompany] = useState("ALL");

  const [saleData, setSaleData] = useState({
    companyName: "",
    billNo: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    remarks: "",
    isCashSale: false,
  });

  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // --------------------------------------------------------
  // Fetch Customers
  // --------------------------------------------------------
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const params = {
        page: 1,
        limit: 500,
        search: customerSearch,
      };

      if (activeCompany !== "ALL") params.companyName = activeCompany;

      const res = await axios.get(`${API_BASE}/customers`, { params });
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Customer fetch error:", err);
    }
    setLoadingCustomers(false);
  };

  // --------------------------------------------------------
  // Fetch Inventory
  // --------------------------------------------------------
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const query =
        activeCompany !== "ALL"
          ? `?companyName=${encodeURIComponent(activeCompany)}`
          : "";

      const res = await axios.get(`${API_BASE}/inventory${query}`);
      setInventory(res.data.items || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
    setLoadingInventory(false);
  };

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
  }, [activeCompany]);

  useEffect(() => {
    fetchCustomers();
  }, [customerSearch]);

  // --------------------------------------------------------
  // Add Item
  // --------------------------------------------------------
  const addItem = (item) => {
    const exists = selectedItems.find((i) => i.itemCode === item.itemCode);
    if (exists) return;

    setSelectedItems([
      ...selectedItems,
      {
        itemName: item.itemName,
        itemCode: item.itemCode,
        qty: 1,
        rate: item.avgRate || 0,
        vatRate: 5,
        vatIncluded: false,
        netAmount: item.avgRate || 0,
        vatAmount: 0,
        grossAmount: item.avgRate || 0,
      },
    ]);
  };

  // --------------------------------------------------------
  // VAT Logic
  // --------------------------------------------------------
  const recalcItem = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const vatRate = Number(item.vatRate) || 0;

    if (item.vatIncluded) {
      const net = (rate / (1 + vatRate / 100)) * qty;
      const vat = rate * qty - net;
      return {
        ...item,
        netAmount: net,
        vatAmount: vat,
        grossAmount: rate * qty,
      };
    } else {
      const net = rate * qty;
      const vat = net * (vatRate / 100);
      return {
        ...item,
        netAmount: net,
        vatAmount: vat,
        grossAmount: net + vat,
      };
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    updated[index] = recalcItem(updated[index]);
    setSelectedItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const subtotal = selectedItems.reduce((a, b) => a + b.netAmount, 0);
  const totalVat = selectedItems.reduce((a, b) => a + b.vatAmount, 0);
  const grandTotal = selectedItems.reduce((a, b) => a + b.grossAmount, 0);

  // --------------------------------------------------------
  // SUBMIT SALE
  // --------------------------------------------------------
  const submitSale = async () => {
    if (!saleData.companyName || !saleData.billNo) {
      alert("Company Name & Bill No required");
      return;
    }

    if (!saleData.isCashSale && !selectedCustomer) {
      alert("Select a customer");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Select at least one item");
      return;
    }

    const payload = {
      ...saleData,
      partyName: selectedCustomer?.partyName || "",
      partyCode: selectedCustomer?.partyCode || "",
      partyVatNo: selectedCustomer?.partyVatNo || "",
      partyAddress: selectedCustomer?.address || [],
      items: selectedItems.map((i) => ({
        ...i,
        amount: i.netAmount,
      })),
      subtotal,
      vatTotal: totalVat,
      totalAmount: grandTotal,
    };

    try {
      await axios.post(`${API_BASE}/add-sale`, payload);
      alert("Sale created!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error saving sale");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ============================================================
          TITLE
      ============================================================ */}
      <h2 className="text-3xl font-semibold mb-6">Create New Sale</h2>

      {/* ============================================================
          COMPANY SELECTOR
      ============================================================ */}
      <div className="flex gap-2 mb-6">
        {["ALL", "ABC", "XYZ"].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCompany(c)}
            className={`px-4 py-2 rounded font-semibold border ${
              activeCompany === c
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ============================================================
          SALE BASICS
      ============================================================ */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Company Name"
          className="border p-2 rounded"
          value={saleData.companyName}
          onChange={(e) =>
            setSaleData({ ...saleData, companyName: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Bill No"
          className="border p-2 rounded"
          value={saleData.billNo}
          onChange={(e) =>
            setSaleData({ ...saleData, billNo: e.target.value })
          }
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={saleData.date}
          onChange={(e) => setSaleData({ ...saleData, date: e.target.value })}
        />
      </div>

      {/* ============================================================
          CASH OR CUSTOMER
      ============================================================ */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={saleData.isCashSale}
          onChange={(e) =>
            setSaleData({ ...saleData, isCashSale: e.target.checked })
          }
        />
        <span className="font-semibold">Cash Sale</span>
      </div>

      {/* ============================================================
          CUSTOMER DROPDOWN
      ============================================================ */}
      {!saleData.isCashSale && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Select Customer</h3>

          <input
            type="text"
            placeholder="Search customer..."
            className="border p-2 rounded w-full mb-2"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />

          <div className="border rounded bg-white max-h-48 overflow-y-auto">
            {loadingCustomers ? (
              <p className="p-3 text-gray-500">Loading...</p>
            ) : customers.length === 0 ? (
              <p className="p-3 text-gray-500">No customers found</p>
            ) : (
              customers.map((cust) => (
                <div
                  key={cust._id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                    selectedCustomer?._id === cust._id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedCustomer(cust)}
                >
                  <div className="font-medium">{cust.partyName}</div>
                  <div className="text-xs text-gray-600">
                    {cust.partyCode} | {cust.phone}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-3 text-sm bg-gray-50 p-3 rounded border">
              <strong>Selected:</strong> {selectedCustomer.partyName}  
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          INVENTORY SEARCH
      ============================================================ */}
      <h3 className="text-xl font-semibold mb-2">Select Items</h3>

      <input
        type="text"
        placeholder="Search items..."
        className="border p-2 rounded mb-4 w-full md:w-1/2"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ============================================================
          INVENTORY LIST
      ============================================================ */}
      <div className="border rounded bg-white h-60 overflow-y-auto mb-6">
        {loadingInventory ? (
          <p className="p-3">Loading inventory...</p>
        ) : filteredInventory.length === 0 ? (
          <p className="p-3">No products found</p>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item._id}
              className="p-3 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => addItem(item)}
            >
              <div className="font-medium">{item.itemName}</div>
              <div className="text-xs text-gray-500">
                Code: {item.itemCode} | Stock: {item.availableQty}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================================
          SELECTED ITEMS TABLE (with VAT)
      ============================================================ */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Selected Items</h3>

          <table className="w-full bg-white rounded shadow border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">VAT %</th>
                <th className="p-2 text-center">VAT Included?</th>
                <th className="p-2 text-right">Net</th>
                <th className="p-2 text-right">VAT</th>
                <th className="p-2 text-right">Gross</th>
                <th className="p-2 text-center">X</th>
              </tr>
            </thead>

            <tbody>
              {selectedItems.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{item.itemName}</td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className="border p-1 w-20 text-right rounded"
                      value={item.qty}
                      onChange={(e) => updateItem(index, "qty", e.target.value)}
                    />
                  </td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className="border p-1 w-20 text-right rounded"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(index, "rate", e.target.value)
                      }
                    />
                  </td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      className="border p-1 w-16 text-right rounded"
                      value={item.vatRate}
                      onChange={(e) =>
                        updateItem(index, "vatRate", e.target.value)
                      }
                    />
                  </td>

                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.vatIncluded}
                      onChange={(e) =>
                        updateItem(index, "vatIncluded", e.target.checked)
                      }
                    />
                  </td>

                  <td className="p-2 text-right">{item.netAmount.toFixed(2)}</td>
                  <td className="p-2 text-right">{item.vatAmount.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    {item.grossAmount.toFixed(2)}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      className="text-red-500"
                      onClick={() => removeItem(index)}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================
          TOTALS
      ============================================================ */}
      <div className="text-right text-lg font-semibold mb-6">
        <div>Subtotal: AED {subtotal.toFixed(2)}</div>
        <div>VAT Total: AED {totalVat.toFixed(2)}</div>
        <div className="text-xl mt-1">
          Grand Total:{" "}
          <span className="font-bold">AED {grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ============================================================
          SUBMIT BUTTON
      ============================================================ */}
      <button
        onClick={submitSale}
        className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
      >
        Save Sale
      </button>
    </div>
  );
}
// a