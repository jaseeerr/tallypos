import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";

export default function Purchase() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    voucherNumber: "",
    date: new Date().toISOString().slice(0, 10),
    partyLedgerName: "",
    narration: "",
    items: [],
    totalBeforeVAT: 0,
    totalVAT: 0,
    netAmount: 0,
  });

  // 🔹 Fetch all purchases
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/getPurchases`);
      setPurchases(res.data.data || []);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/getAllProducts`);
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  // 🔹 Auto recalc totals whenever items change
  useEffect(() => {
    if (!formData.items.length) {
      setFormData((prev) => ({
        ...prev,
        totalBeforeVAT: 0,
        totalVAT: 0,
        netAmount: 0,
      }));
      return;
    }

    const totalBeforeVAT = formData.items.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );
    const totalVAT = formData.items.reduce(
      (sum, i) => sum + Number(i.vatAmount || 0),
      0
    );
    const netAmount = totalBeforeVAT + totalVAT;

    setFormData((prev) => ({
      ...prev,
      totalBeforeVAT,
      totalVAT,
      netAmount,
    }));
  }, [formData.items]);

  // 🔹 Open modal for Add/Edit
  const openModal = (purchase = null) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setFormData({
        ...purchase,
        date:
          purchase.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        items: purchase.items || [],
      });
    } else {
      setEditingPurchase(null);
      setFormData({
        voucherNumber: "",
        date: new Date().toISOString().slice(0, 10),
        partyLedgerName: "",
        narration: "",
        items: [],
        totalBeforeVAT: 0,
        totalVAT: 0,
        netAmount: 0,
      });
    }
    setShowModal(true);
  };

  // 🔹 Handle header field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Add new item row
  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: "",
          itemCode: "",
          quantity: 1,
          unit: "",
          rate: 0,
          discount: 0,
          vatPercent: 5,
          amount: 0,
          vatAmount: 0,
          netAmount: 0,
        },
      ],
    }));
  };

  // 🔹 Remove item row
  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // 🔹 Handle item field changes + recalc
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Autofill product details
      if (field === "itemName") {
        const product = products.find((p) => p.name === value);
        if (product) {
          newItems[index] = {
            ...newItems[index],
            itemCode: product.code,
            unit: product.unit,
            rate: Number(product.rate || 0),
            vatPercent: Number(product.vatPercent || 5),
          };
        }
      }

      const qty = Number(newItems[index].quantity || 0);
      const rate = Number(newItems[index].rate || 0);
      const discount = Number(newItems[index].discount || 0);
      const vatPercent = Number(newItems[index].vatPercent || 0);

      const amount = qty * rate - discount;
      const vatAmount = (amount * vatPercent) / 100;
      const netAmount = amount + vatAmount;

      newItems[index] = { ...newItems[index], amount, vatAmount, netAmount };
      return { ...prev, items: newItems };
    });
  };

  // 🔹 Save or update purchase
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (editingPurchase) {
        await axios.put(`${API_BASE}/editPurchase/${editingPurchase._id}`, payload);
      } else {
        await axios.post(`${API_BASE}/addPurchase`, payload);
      }
      setShowModal(false);
      setEditingPurchase(null);
      fetchPurchases();
    } catch (err) {
      console.error("Save Purchase Error:", err);
    }
  };

  // 🔹 Delete purchase
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this purchase?")) {
      try {
        await axios.delete(`${API_BASE}/deletePurchase/${id}`);
        fetchPurchases();
      } catch (err) {
        console.error("Delete Purchase Error:", err);
      }
    }
  };

  // 🔹 Filter purchases
  const filteredPurchases = purchases.filter(
    (p) =>
      p.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partyLedgerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 sm:mb-0">
          Purchases
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by voucher or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => openModal(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            + Add Purchase
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-600">Loading purchases...</p>
      ) : filteredPurchases.length === 0 ? (
        <p className="text-gray-600">No purchases found.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Voucher</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-right">Before VAT</th>
                <th className="p-3 text-right">VAT</th>
                <th className="p-3 text-right">Net</th>
                <th className="p-3 text-left">Narration</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p) => (
                <tr key={p._id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{p.voucherNumber}</td>
                  <td className="p-3">
                    {new Date(p.date).toLocaleDateString()}
                  </td>
                  <td className="p-3">{p.partyLedgerName}</td>
                  <td className="p-3 text-right">
                    {Number(p.totalBeforeVAT || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    {Number(p.totalVAT || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    {Number(p.netAmount || 0).toFixed(2)}
                  </td>
                  <td className="p-3">{p.narration}</td>
                  <td className="p-3 text-center flex justify-center gap-3">
                    <button
                      onClick={() => openModal(p)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[95%] max-w-5xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">
              {editingPurchase ? "Edit Purchase" : "Add New Purchase"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Header Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Voucher Number</label>
                  <input
                    type="text"
                    name="voucherNumber"
                    value={formData.voucherNumber}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Supplier Name</label>
                  <input
                    type="text"
                    name="partyLedgerName"
                    value={formData.partyLedgerName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-2">
                  Purchase Items
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-md">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Rate</th>
                        <th className="p-2">Discount</th>
                        <th className="p-2">VAT%</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-right">VAT</th>
                        <th className="p-2 text-right">Net</th>
                        <th className="p-2 text-center">❌</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            <select
                              value={item.itemName}
                              onChange={(e) =>
                                handleItemChange(index, "itemName", e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-full"
                            >
                              <option value="">Select</option>
                              {products.map((p) => (
                                <option key={p._id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(index, "quantity", e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) =>
                                handleItemChange(index, "rate", e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-24"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                handleItemChange(index, "discount", e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.vatPercent}
                              onChange={(e) =>
                                handleItemChange(index, "vatPercent", e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-16"
                            />
                          </td>
                          <td className="p-2 text-right">
                            {Number(item.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            {Number(item.vatAmount || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            {Number(item.netAmount || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="mt-3 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  + Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="flex flex-col sm:flex-row justify-end gap-6 text-sm font-medium mt-4">
                <div>Total Before VAT: {formData.totalBeforeVAT.toFixed(2)}</div>
                <div>Total VAT: {formData.totalVAT.toFixed(2)}</div>
                <div>Net Amount: {formData.netAmount.toFixed(2)}</div>
              </div>

              {/* Narration */}
              <div className="mt-4">
                <label className="text-sm text-gray-600">Narration</label>
                <textarea
                  name="narration"
                  value={formData.narration}
                  onChange={handleChange}
                  rows="2"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingPurchase ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
