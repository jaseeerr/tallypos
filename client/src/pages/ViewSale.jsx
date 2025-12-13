import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/url";
import MyAxiosInstance from "../utils/axios";
export default function ViewSale() {
  const axiosInstance = MyAxiosInstance()
  const { billNo } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  const fetchSale = async () => {
    try {
      const res = await axiosInstance.get(`/sale/${billNo}`);
      setSale(res.data.sale);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sale:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, [billNo]);

  if (loading) return <p className="p-6 text-gray-600">Loading sale...</p>;
  if (!sale) return <p className="p-6 text-red-600">Sale not found.</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-3 py-1.5 border rounded-md hover:bg-gray-100"
      >
        ← Back
      </button>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-2">
        Sale #{sale.billNo}
      </h1>
      <p className="text-gray-600 mb-6">
        Company: <span className="font-medium">{sale.companyName}</span>
      </p>

      {/* Sale Summary */}
      <div className="bg-white border rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Date:</p>
            <p className="font-medium">
              {new Date(sale.date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-gray-600">Status:</p>
            <p
              className={`font-medium ${
                sale.status === "synced"
                  ? "text-green-600"
                  : sale.status === "error"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {sale.status.toUpperCase()}
            </p>
          </div>

          <div>
            <p className="text-gray-600">Sync Attempts:</p>
            <p className="font-medium">{sale.syncAttempts}</p>
          </div>

          {sale.syncError && (
            <div className="sm:col-span-2">
              <p className="text-red-600 text-sm mt-1">
                Error: {sale.syncError}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Party / Cash Info */}
      <div className="bg-white border rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Party Details</h3>

        {sale.isCashSale ? (
          <div className="text-sm">
            <p className="font-medium text-blue-700">Cash Sale</p>
            <p>Ledger: {sale.cashLedgerName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Customer:</p>
              <p className="font-medium">{sale.partyName}</p>
            </div>

            <div>
              <p className="text-gray-600">Party Code:</p>
              <p className="font-medium">{sale.partyCode}</p>
            </div>

            <div>
              <p className="text-gray-600">VAT No:</p>
              <p>{sale.partyVatNo || "-"}</p>
            </div>

            <div>
              <p className="text-gray-600">Address:</p>
              {sale.partyAddress?.map((a, idx) => (
                <p key={idx}>{a.address}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white border rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Items</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.itemName}</td>
                  <td className="p-2">{item.itemCode}</td>
                  <td className="p-2 text-right">{item.qty}</td>
                  <td className="p-2 text-right">{item.rate.toFixed(2)}</td>
                  <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-white border rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Ledgers</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Ledger</th>
                <th className="p-2 text-right">%</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.ledgers?.map((l, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{l.ledgerName}</td>
                  <td className="p-2 text-right">{l.percentage}</td>
                  <td className="p-2 text-right">{l.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white border rounded-lg shadow p-4 mb-10">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Tally Logs</h3>
          <button
            className="text-blue-600 text-sm"
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
        </div>

        {showLogs && (
          <div className="mt-4 space-y-3 text-sm">
            {sale.tallyResponseLogs?.length === 0 && (
              <p className="text-gray-500">No logs available.</p>
            )}

            {sale.tallyResponseLogs?.map((log, idx) => (
              <div
                key={idx}
                className="p-3 border rounded bg-gray-50 text-gray-700"
              >
                <p className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
                <pre className="mt-1 whitespace-pre-wrap text-xs">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
