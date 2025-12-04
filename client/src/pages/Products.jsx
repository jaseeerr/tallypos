import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function AddSale() {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  const [saleData, setSaleData] = useState({
    companyName: "",
    billNo: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    remarks: "",
    isCashSale: false,
    cashLedgerName: "",
    partyCode: "",
    partyName: "",
    partyVatNo: "",
    partyAddress: "",
  });

  const [loadingInventory, setLoadingInventory] = useState(true);

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const res = await axios.get(`${API_BASE}/inventory`);
      setInventory(res.data.items || []);
      setLoadingInventory(false);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Add item to sale
  const addItem = (item) => {
    const exists = selectedItems.find((i) => i.itemCode === item.itemCode);
    if (exists) return;

    const rate = item.avgRate || 0;
    const qty = 1;
    const vatRate = item.vatRate || 0;
    const amount = qty * rate;
    const vatAmount = (amount * vatRate) / 100;

    setSelectedItems([
      ...selectedItems,
      {
        itemName: item.itemName,
        itemCode: item.itemCode,
        itemGroup: item.itemGroup,
        description: item.description,
        qty,
        unit: item.unit,
        rate,
        amount,
        rateOfTax: vatRate,
        vatAmount,
      },
    ]);
  };

  // Handle qty / rate / vat change
  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;

    const qty = parseFloat(updated[index].qty) || 0;
    const rate = parseFloat(updated[index].rate) || 0;
    const vatRate = parseFloat(updated[index].rateOfTax) || 0;

    updated[index].amount = qty * rate;
    updated[index].vatAmount = (qty * rate * vatRate) / 100;

    setSelectedItems(updated);
  };

  // Remove selected item
  const removeItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // TOTALS
  const totalAmount = selectedItems.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  const totalVat = selectedItems.reduce(
    (sum, i) => sum + Number(i.vatAmount || 0),
    0
  );

  // Submit sale
  const submitSale = async () => {
    if (!saleData.companyName || !saleData.billNo) {
      return alert("Company name & Bill No are required");
    }

    if (selectedItems.length === 0) {
      return alert("Add at least one item");
    }

    // VAT Ledger
    const vatLedger = {
      ledgerName: `VAT@5%`,
      percentage: 5,
      amount: totalVat,
    };

    const payload = {
      ...saleData,
      partyAddress: saleData.partyAddress
        ? saleData.partyAddress.split("\n")
        : [],
      items: selectedItems,
      totalAmount: totalAmount + totalVat, // Tally requires VAT included in total
      ledgers: [vatLedger],
    };

    try {
      await axios.post(`${API_BASE}/add-sale`, payload);
      alert("Sale created successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Error adding sale:", err);
      alert("Error saving sale");
    }
  };

  // Filter inventory
  const filteredInventory = inventory.filter((i) =>
    i.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">
        Create New Sale
      </h2>

      {/* SALE INFO */}
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

      {/* CASH SALE */}
      <div className="flex gap-4 mb-6">
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

      {!saleData.isCashSale && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <input
            type="text"
            placeholder="Party Code"
            className="border p-2 rounded"
            value={saleData.partyCode}
            onChange={(e) =>
              setSaleData({ ...saleData, partyCode: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Party Name"
            className="border p-2 rounded"
            value={saleData.partyName}
            onChange={(e) =>
              setSaleData({ ...saleData, partyName: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="VAT No"
            className="border p-2 rounded"
            value={saleData.partyVatNo}
            onChange={(e) =>
              setSaleData({ ...saleData, partyVatNo: e.target.value })
            }
          />

          <textarea
            placeholder="Address (each line separated)"
            className="border p-2 rounded col-span-3"
            rows="3"
            value={saleData.partyAddress}
            onChange={(e) =>
              setSaleData({ ...saleData, partyAddress: e.target.value })
            }
          ></textarea>
        </div>
      )}

      {/* INVENTORY SEARCH */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Select Items</h3>
        <input
          type="text"
          placeholder="Search items..."
          className="border p-2 rounded w-full md:w-1/2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* INVENTORY LIST */}
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

      {/* SELECTED ITEMS TABLE */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Selected Items</h3>

          <table className="w-full border-collapse bg-white rounded shadow">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">VAT %</th>
                <th className="p-2 text-right">VAT Amt</th>
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
                      className="border p-1 w-20 text-right rounded"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(index, "qty", e.target.value)
                      }
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
                      className="border p-1 w-20 text-right rounded"
                      value={item.rateOfTax}
                      onChange={(e) =>
                        updateItem(index, "rateOfTax", e.target.value)
                      }
                    />
                  </td>

                  <td className="p-2 text-right">
                    {item.vatAmount.toFixed(2)}
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

      {/* TOTALS */}
      <div className="text-right text-xl font-semibold mb-2">
        Subtotal: AED {totalAmount.toFixed(2)}
      </div>
      <div className="text-right text-xl font-semibold mb-2">
        VAT: AED {totalVat.toFixed(2)}
      </div>
      <div className="text-right text-2xl font-bold mb-6">
        Grand Total: AED {(totalAmount + totalVat).toFixed(2)}
      </div>

      {/* SUBMIT */}
      <button
        onClick={submitSale}
        className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition"
      >
        Save Sale
      </button>
    </div>
  );
}
