import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function AddSale() {
  // =============================
  //  STATE
  // =============================
  const [activeCompany, setActiveCompany] = useState("ABC");

  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedItems, setSelectedItems] = useState([]);

  const [saleData, setSaleData] = useState({
    billNo: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    remarks: "",
    isCashSale: false,
    customerId: "",
    includeVat: true,
  });

  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // =============================
  //  FETCH INVENTORY BY COMPANY
  // =============================
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);

      const res = await axios.get(
        `${API_BASE}/inventory`,
        { params: { companyName: activeCompany } }
      );

      setInventory(res.data.items || []);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    }

    setLoadingInventory(false);
  };

  // =============================
  //  FETCH CUSTOMERS BY COMPANY
  // =============================
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const res = await axios.get(`${API_BASE}/customers`, {
        params: { companyName: activeCompany, limit: 9999 },
      });

      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Customer fetch error:", err);
    }

    setLoadingCustomers(false);
  };

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
    setSelectedItems([]);
  }, [activeCompany]);

  // =============================
  //  SELECT ITEMS
  // =============================
  const addItem = (item) => {
    const exists = selectedItems.find((i) => i.itemCode === item.itemCode);
    if (exists) return;

    setSelectedItems([
      ...selectedItems,
      {
        itemName: item.itemName,
        itemCode: item.itemCode,
        itemGroup: item.itemGroup,
        qty: 1,
        unit: item.unit,
        rate: item.avgRate || 0,
        amount: item.avgRate || 0,
        rateOfTax: item.vatRate || 5, // DEFAULT VAT
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;

    // Recalculate amount
    updated[index].amount =
      parseFloat(updated[index].qty) * parseFloat(updated[index].rate);

    setSelectedItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // =============================
  //  VAT CALCULATIONS
  // =============================
  const subtotal = selectedItems.reduce((sum, i) => sum + Number(i.amount), 0);

  const totalVat = saleData.includeVat
    ? selectedItems.reduce(
        (sum, i) =>
          sum +
          (Number(i.amount) * Number(i.rateOfTax || 0)) / 100,
        0
      )
    : 0;

  const finalTotal = subtotal + totalVat;

  // =============================
  //  SUBMIT SALE
  // =============================
  const submitSale = async () => {
    if (!saleData.billNo) return alert("Bill No is required");
    if (selectedItems.length === 0) return alert("Add at least one item");

    const payload = {
      ...saleData,
      companyName: activeCompany,
      items: selectedItems,
      subtotal,
      vatAmount: totalVat,
      totalAmount: finalTotal,
    };

    try {
      await axios.post(`${API_BASE}/add-sale`, payload);
      alert("Sale added successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Error saving sale:", err);
      alert("Error saving sale");
    }
  };

  // =============================
  //  FILTER INVENTORY
  // =============================
  const filteredInventory = inventory.filter((i) =>
    i.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      
      {/* =============================
          COMPANY SELECTOR
      ============================= */}
      <div className="flex gap-3 mb-6">
        {["ABC", "FANCY-PALACE-TRADING-LLC"].map((comp) => (
          <button
            key={comp}
            onClick={() => setActiveCompany(comp)}
            className={`px-4 py-2 rounded-md border font-semibold transition ${
              activeCompany === comp
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {comp}
          </button>
        ))}
      </div>

      <h2 className="text-3xl font-semibold mb-6">Create Sale</h2>

      {/* =============================
          SALE INFO
      ============================= */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
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

        {/* VAT toggle */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={saleData.includeVat}
            onChange={(e) =>
              setSaleData({ ...saleData, includeVat: e.target.checked })
            }
          />
          Include VAT
        </label>
      </div>

      {/* =============================
          CASH OR CUSTOMER
      ============================= */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={saleData.isCashSale}
            onChange={(e) =>
              setSaleData({ ...saleData, isCashSale: e.target.checked })
            }
          />
          Cash Sale
        </label>
      </div>

      {/* CUSTOMER DROPDOWN */}
      {!saleData.isCashSale && (
        <div className="mb-6">
          <select
            className="border p-2 rounded w-full md:w-1/2"
            value={saleData.customerId}
            onChange={(e) =>
              setSaleData({ ...saleData, customerId: e.target.value })
            }
          >
            <option value="">Select Customer</option>

            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.partyName} — {c.partyCode}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* =============================
          INVENTORY SEARCH
      ============================= */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search inventory..."
          className="border p-2 rounded w-full md:w-1/2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* =============================
          INVENTORY LIST
      ============================= */}
      <div className="border rounded p-4 h-64 overflow-y-auto mb-6 bg-white">
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
              <div className="text-sm text-gray-500">
                Code: {item.itemCode} | Stock: {item.availableQty}
              </div>
            </div>
          ))
        )}
      </div>

      {/* =============================
          SELECTED ITEMS TABLE
      ============================= */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <table className="w-full border-collapse bg-white rounded shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">VAT %</th>
                <th className="p-2 text-right">Amount</th>
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
                      onChange={(e) =>
                        updateItem(index, "qty", e.target.value)
                      }
                      className="border p-1 w-20 text-right rounded"
                    />
                  </td>

                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(index, "rate", e.target.value)
                      }
                      className="border p-1 w-20 text-right rounded"
                    />
                  </td>

                  {/* VAT PERCENT INPUT */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={item.rateOfTax}
                      onChange={(e) =>
                        updateItem(index, "rateOfTax", e.target.value)
                      }
                      className="border p-1 w-20 text-right rounded"
                    />
                  </td>

                  <td className="p-2 text-right">
                    {item.amount.toFixed(2)}
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

      {/* =============================
          TOTALS
      ============================= */}
      <div className="text-right text-lg font-semibold mb-6">
        Subtotal: AED {subtotal.toFixed(2)} <br />
        VAT: AED {totalVat.toFixed(2)} <br />
        <span className="text-xl font-bold">
          Total: AED {finalTotal.toFixed(2)}
        </span>
      </div>

      {/* =============================
          SUBMIT
      ============================= */}
      <button
        onClick={submitSale}
        className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
      >
        Save Sale
      </button>
    </div>
  );
}
