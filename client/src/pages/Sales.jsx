import { useEffect, useState } from "react";
import MyAxiosInstance from "../utils/axios";

export default function AddSale() {
  const axios = MyAxiosInstance();

  // =============================
  // STATE
  // =============================
  const [companyName, setCompanyName] = useState("ABC");

  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [inventorySearch, setInventorySearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedItems, setSelectedItems] = useState([]);

  const [sale, setSale] = useState({
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    remarks: "",
    isCashSale: false,
    cashLedgerName: "",
    customerId: "",
  });

  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // =============================
  // FETCH INVENTORY
  // =============================
  const fetchInventory = async () => {
    setLoadingInventory(true);
    const res = await axios.get("/inventory", {
      params: {
        companyName,
        search: inventorySearch,
        page: 1,
        limit: 50,
        includeOutOfStock: false,
      },
    });
    setInventory(res.data.items || []);
    setLoadingInventory(false);
  };

  // =============================
  // FETCH CUSTOMERS
  // =============================
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    const res = await axios.get("/customers", {
      params: {
        companyName,
        search: customerSearch,
        page: 1,
        limit: 50,
      },
    });
    setCustomers(res.data.items || res.data.customers || []);
    setLoadingCustomers(false);
  };

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
    setSelectedItems([]);
  }, [companyName]);

  // =============================
  // ADD ITEM
  // =============================
  const addItem = (item) => {
    if (selectedItems.find(i => i.itemId === item._id)) return;

    setSelectedItems(prev => [
      ...prev,
      {
        itemId: item._id,
        name: item.NAME,
        qty: 1,
        rate: Number(item.SALESPRICE) || 0,
        rateOfTax: 5,
        amount: Number(item.SALESPRICE) || 0,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = Number(value);
    updated[index].amount = updated[index].qty * updated[index].rate;
    setSelectedItems(updated);
  };

  const removeItem = (index) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // =============================
  // TOTALS (DISPLAY ONLY)
  // =============================
  const subtotal = selectedItems.reduce((s, i) => s + i.amount, 0);
  const vatAmount = selectedItems.reduce(
    (s, i) => s + (i.amount * i.rateOfTax) / 100,
    0
  );
  const total = subtotal + vatAmount;

  // =============================
  // SUBMIT SALE
  // =============================
  const submitSale = async () => {
    if (!sale.billNo) return alert("Bill number required");
    if (!sale.isCashSale && !sale.customerId) return alert("Select customer");
    if (sale.isCashSale && !sale.cashLedgerName)
      return alert("Cash ledger name required");
    if (selectedItems.length === 0) return alert("Add items");

    const payload = {
      companyName,
      billNo: sale.billNo,
      date: sale.date,
      reference: sale.reference,
      remarks: sale.remarks,
      isCashSale: sale.isCashSale,
      cashLedgerName: sale.cashLedgerName,
      customerId: sale.customerId || null,
      items: selectedItems.map(i => ({
        itemId: i.itemId,
        qty: i.qty,
        rate: i.rate,
        rateOfTax: i.rateOfTax,
      })),
    };

    try {
      await axios.post("/add-sale", payload);
      alert("Sale created");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to save sale");
    }
  };

  // =============================
  // RENDER
  // =============================
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* COMPANY */}
      <div className="flex gap-2">
        {["ABC", "FANCY-PALACE-TRADING-LLC"].map(c => (
          <button
            key={c}
            onClick={() => setCompanyName(c)}
            className={`px-3 py-1 border ${companyName === c ? "bg-blue-600 text-white" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* BASIC INFO */}
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="Bill No" value={sale.billNo}
          onChange={e => setSale({ ...sale, billNo: e.target.value })} />
        <input type="date" value={sale.date}
          onChange={e => setSale({ ...sale, date: e.target.value })} />
        <label>
          <input type="checkbox" checked={sale.isCashSale}
            onChange={e => setSale({ ...sale, isCashSale: e.target.checked })} />
          Cash Sale
        </label>
      </div>

      {!sale.isCashSale && (
        <>
          <input
            placeholder="Search customer"
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            onBlur={fetchCustomers}
          />
          <select
            value={sale.customerId}
            onChange={e => setSale({ ...sale, customerId: e.target.value })}
          >
            <option value="">Select customer</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </>
      )}

      {sale.isCashSale && (
        <input
          placeholder="Cash Ledger Name"
          value={sale.cashLedgerName}
          onChange={e => setSale({ ...sale, cashLedgerName: e.target.value })}
        />
      )}

      {/* INVENTORY */}
      <input
        placeholder="Search inventory"
        value={inventorySearch}
        onChange={e => setInventorySearch(e.target.value)}
        onBlur={fetchInventory}
      />

      <div className="border max-h-48 overflow-auto">
        {inventory.map(i => (
          <div key={i._id} onClick={() => addItem(i)} className="p-2 cursor-pointer">
            {i.NAME}
          </div>
        ))}
      </div>

      {/* ITEMS */}
      {selectedItems.map((i, idx) => (
        <div key={idx} className="flex gap-2">
          <span className="flex-1">{i.name}</span>
          <input type="number" value={i.qty} onChange={e => updateItem(idx, "qty", e.target.value)} />
          <input type="number" value={i.rate} onChange={e => updateItem(idx, "rate", e.target.value)} />
          <input type="number" value={i.rateOfTax} onChange={e => updateItem(idx, "rateOfTax", e.target.value)} />
          <span>{i.amount.toFixed(2)}</span>
          <button onClick={() => removeItem(idx)}>✖</button>
        </div>
      ))}

      {/* TOTALS */}
      <div>
        Subtotal: {subtotal.toFixed(2)} <br />
        VAT: {vatAmount.toFixed(2)} <br />
        <b>Total: {total.toFixed(2)}</b>
      </div>

      <button onClick={submitSale} className="px-6 py-2 bg-green-600 text-white">
        Save Sale
      </button>
    </div>
  );
}
