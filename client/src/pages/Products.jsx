import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../utils/url";
export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    unit: "",
    rate: "",
    vatPercent: "",
    openingStock: "",
    availableStock: "",
    godown: "",
  });


  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/getAllProducts`);
      setProducts(res.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle form input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Open modal for add or edit
  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        code: "",
        unit: "",
        rate: "",
        vatPercent: "",
        openingStock: "",
        availableStock: "",
        godown: "",
      });
    }
    setShowModal(true);
  };

  // Add or update product
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axios.put(
          `${API_BASE}/editProduct/${editingProduct._id}`,
          formData
        );
      } else {
        await axios.post(`${API_BASE}/addProduct`, formData);
      }
      setShowModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Save Product Error:", err);
    }
  };

  // Delete product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`${API_BASE}/deleteProduct/${id}`);
        fetchProducts();
      } catch (err) {
        console.error("Delete Product Error:", err);
      }
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 sm:mb-0">
          Products
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => openModal(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Loading / No Data */}
      {loading ? (
        <p className="text-gray-600">Loading products...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-600">No products found.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-left">Godown</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{product.name}</td>
                  <td className="p-3">{product.code}</td>
                  <td className="p-3">{product.unit}</td>
                  <td className="p-3 text-right">
                    {product.rate?.toFixed(2) || "-"}
                  </td>
                  <td className="p-3 text-right">{product.availableStock}</td>
                  <td className="p-3">{product.godown}</td>
                  <td className="p-3 text-center flex justify-center gap-3">
                    <button
                      onClick={() => openModal(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
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

      {/* Add/Edit Modal */}
     {showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
      <h3 className="text-lg font-semibold mb-4">
        {editingProduct ? "Edit Product" : "Add New Product"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Enter product name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Product Code
          </label>
          <input
            id="code"
            type="text"
            name="code"
            placeholder="Enter product code"
            value={formData.code}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="unit"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Unit
          </label>
          <input
            id="unit"
            type="text"
            name="unit"
            placeholder="e.g. pcs, box, etc."
            value={formData.unit}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="rate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Rate
          </label>
          <input
            id="rate"
            type="number"
            name="rate"
            placeholder="Enter rate"
            value={formData.rate}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="availableStock"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Available Stock
          </label>
          <input
            id="availableStock"
            type="number"
            name="availableStock"
            placeholder="Enter available stock"
            value={formData.availableStock}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="godown"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Godown
          </label>
          <input
            id="godown"
            type="text"
            name="godown"
            placeholder="Enter godown name or location"
            value={formData.godown}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            {editingProduct ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}
