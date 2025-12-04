import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function AddSale() {
  // ==========================
  // STATES
  // ==========================
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customerCompanyFilter, setCustomerCompanyFilter] = useState("ALL");

  const [selectedItems, setSelectedItems] = useState([]);
  const [includeVAT, setIncludeVAT] = useState(false);

  const [saleData, setSaleData] = useState({
    companyName: "",
    billNo: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    remarks: "",
    customerId: "",
  });

  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // ==========================
  // FETCH INVENTORY
  // ==========================
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const res = await axios.get(`${API_BASE}/inventory`);
      setInventory(res.data.items || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
    setLoadingInventory(false);
  };

  // ==========================
  // FETCH CUSTOMERS
  // ==========================
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const query =
        customerCompanyFilter !== "ALL"
          ? `?companyName=${encodeURIComponent(customerCompanyFilter)}`
          : "";

      const res = await axios.get(`${API_BASE}/customers${query}`);
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
    setLoadingCustomers(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [customerCompanyFilter]);

  // ==========================
  // FILTER INVENTORY LIST
  // ==========================
  const filteredInventory = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemGroup?.toLowerCase().includes(q)
    );
  });

  // ==========================
  // ADD ITEM
  // ==========================
  const addItem = (item) => {
    const exists = selectedItems.find((i) => i.itemCode === item.itemCode);
    if (exists) return;

    setSelectedItems((prev) => [
      ...prev,
      {
        itemName: item.itemName,
        itemCode: item.itemCode,
        qty: 1,
        rate: item.avgRate || 0,
        amount: item.avgRate || 0,
        rateOfTax: item.vatRate || 5, // default VAT 5%
      },
    ]);
  };

  // ==========================
  // UPDATE ITEM
  // ==========================
  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;

    updated[index].amount =
      parseFloat(updated[index].qty) * parseFloat(updated[index].rate);

    setSelectedItems(updated);
  };

  // ==========================
  // REMOVE ITEM
  // ==========================
  const removeItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // ==========================
  // TOTALS
  // ==========================
  const subTotal = selectedItems.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  const taxAmount = selectedItems.reduce((sum, i) => {
    if (!includeVAT) return sum;
    return sum + (i.amount * i.rateOfTax) / 100;
  }, 0);

  const grandTotal = includeVAT ? subTotal + taxAmount : subTotal;

  // ==========================
  // SUBMIT SALE
  // ==========================
  const submitSale = async () => {
    if (!saleData.companyName || !saleData.billNo) {
      return alert("Company name & Bill No are required");
    }

    if (!saleData.customerId) {
      return alert("Please select a customer");
    }

    if (selectedItems.length === 0) {
      return alert("Add at least one item");
    }

    const payload = {
      ...saleData,
      includeVAT,
      items: selectedItems,
      subTotal,
      taxAmount,
      grandTotal,
    };

    try {
      await axios.post(`${API_BASE}/add-sale`, payload);
      alert("Sale created successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Error saving sale:", err);
      alert("Error saving sale");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">Create New Sale</h2>

      {/* ==========================
          SALE INFO
      ========================== */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
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

      {/* ==========================
          CUSTOMER SELECTOR
      ========================== */}
      <h3 className="text-xl font-semibold mb-2">Select Customer</h3>

      <div className="flex gap-4 mb-3">
        {["ALL", "ABC", "XYZ"].map((c) => (
          <button
            key={c}
            onClick={() => setCustomerCompanyFilter(c)}
            className={`px-4 py-2 rounded border ${
              customerCompanyFilter === c
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <select
        className="border p-2 rounded mb-6 w-full md:w-1/2"
        value={saleData.customerId}
        onChange={(e) =>
          setSaleData({ ...saleData, customerId: e.target.value })
        }
      >
        <option value="">Select Customer</option>
        {customers.map((cust) => (
          <option key={cust._id} value={cust._id}>
            {cust.partyName} ({cust.partyCode})
          </option>
        ))}
      </select>

      {/* ==========================
          VAT OPTION
      ========================== */}
      <label className="flex items-center gap-2 mb-6">
        <input
          type="checkbox"
          checked={includeVAT}
          onChange={(e) => setIncludeVAT(e.target.checked)}
        />
        Include VAT (5%)
      </label>

      {/* ==========================
          SEARCH INVENTORY
      ========================== */}
      <h3 className="text-xl font-semibold mb-3">Select Items</h3>
      <input
        type="text"
        placeholder="Search items..."
        className="border p-2 rounded w-full md:w-1/2"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ==========================
          INVENTORY LIST
      ========================== */}
      <div className="border rounded p-4 h-64 overflow-y-auto bg-white mt-4 mb-6">
        {loadingInventory ? (
          <p>Loading inventory...</p>
        ) : filteredInventory.length === 0 ? (
          <p>No products found.</p>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item._id}
              className="p-3 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => addItem(item)}
            >
              <div className="font-medium">{item.itemName}</div>
              <div className="text-gray-500 text-sm">
                Code: {item.itemCode} | Stock: {item.availableQty}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==========================
          SELECTED ITEMS TABLE
      ========================== */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Selected Items</h3>

          <table className="w-full border-collapse bg-white rounded shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">Amount</th>
                {includeVAT && (
                  <th className="p-2 text-right">VAT%</th>
                )}
                <th className="p-2 text-center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{item.itemName}</td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(index, "qty", e.target.value)}
                      className="border p-1 w-20 rounded text-right"
                    />
                  </td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(index, "rate", e.target.value)}
                      className="border p-1 w-20 rounded text-right"
                    />
                  </td>

                  <td className="p-2 text-right">
                    {item.amount.toFixed(2)}
                  </td>

                  {includeVAT && (
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={item.rateOfTax}
                        onChange={(e) =>
                          updateItem(index, "rateOfTax", e.target.value)
                        }
                        className="border p-1 w-16 rounded text-right"
                      />
                    </td>
                  )}

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

      {/* ==========================
          TOTALS
      ========================== */}
      <div className="text-right text-xl font-semibold mb-6">
        Subtotal: AED {subTotal.toFixed(2)} <br />
        {includeVAT && (
          <>
            VAT: AED {taxAmount.toFixed(2)} <br />
          </>
        )}
        <div className="mt-2 text-2xl text-green-600">
          Grand Total: AED {grandTotal.toFixed(2)}
        </div>
      </div>

      {/* ==========================
          SUBMIT BUTTON
      ========================== */}
      <button
        onClick={submitSale}
        className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
      >
        Save Sale
      </button>
    </div>
  );
}
