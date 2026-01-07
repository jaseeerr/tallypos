import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Activity,AlertTriangle, RefreshCcw, Clock
} from "lucide-react";
import MyAxiosInstance from "../utils/axios";
const companies = [
  "AMANA-FIRST-TRADING-LLC",
  "FANCY-PALACE-TRADING-LLC"
];

const modules = ["customers", "inventory"];
const POLL_INTERVAL = 5;

export default function Home() {
 const axiosInstance = MyAxiosInstance()
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
const [salesLoading, setSalesLoading] = useState(false);
const [salesSummary, setSalesSummary] = useState({
  errored: 0,
  needsAttention: 0
});
const [salesData, setSalesData] = useState([]);
const fetchHealth = async () => {
  setLoading(true);

  try {
    const res = await axiosInstance.get("/fetch-health");

    setData(res.data?.data || {});
  } catch (err) {
    console.error(
      "Health fetch failed",
      err.response?.data || err.message
    );
  } finally {
    setLoading(false);
    setCountdown(POLL_INTERVAL);
  }
};


const fetchSalesAttention = async () => {
  setSalesLoading(true);
  try {
    const res = await axiosInstance.get("/sales-attention");
    setSalesSummary(res.data.summary || {});
    setSalesData(res.data.data || []);
  } catch (err) {
    console.error(
      "Sales attention fetch failed",
      err.response?.data || err.message
    );
  } finally {
    setSalesLoading(false);
  }
};




  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, []);
useEffect(() => {
  fetchSalesAttention();
}, []);
  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          fetchHealth();
          return POLL_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const renderStatusCard = (company, module) => {
    const status = data?.[company]?.[module];
    const isLive = status?.state === "live";

    return (
      <div
        key={`${company}-${module}`}
        className={`rounded-xl border p-6 shadow-sm transition-all
          ${isLive
            ? "border-green-400 bg-green-50"
            : "border-red-400 bg-red-50"}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {company.replace(/-/g, " ")}
          </h3>
          {isLive ? (
            <CheckCircle className="text-green-600 w-6 h-6" />
          ) : (
            <XCircle className="text-red-600 w-6 h-6" />
          )}
        </div>

        <div className="text-lg font-bold capitalize text-gray-900">
          {module}
        </div>

        <div
          className={`mt-2 text-sm font-medium
            ${isLive ? "text-green-700" : "text-red-700"}
          `}
        >
          {isLive ? "LIVE" : "BROKEN"}
        </div>

        {status?.lastChecked && (
          <div className="mt-3 text-xs text-gray-500">
            Last checked:{" "}
            {new Date(status.lastChecked).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">
            Tally Fetch Health Monitor
          </h1>
        </div>

        {/* Status line */}
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Verifying system health… next check in{" "}
                <span className="font-semibold">{countdown}s</span>
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>
                System verified — next check in{" "}
                <span className="font-semibold">{countdown}s</span>
              </span>
            </>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((company) =>
            modules.map((module) =>
              renderStatusCard(company, module)
            )
          )}
        </div>
        {/* ================= SALES ATTENTION ================= */}
<div className="mt-12">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-gray-800">
      Sales Attention Monitor
    </h2>

    <button
      onClick={fetchSalesAttention}
      disabled={salesLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg
        bg-blue-600 text-white text-sm font-medium
        hover:bg-blue-700 disabled:opacity-60"
    >
      <RefreshCcw
        className={`w-4 h-4 ${salesLoading ? "animate-spin" : ""}`}
      />
      Refresh
    </button>
  </div>

  {/* Summary cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <div className="rounded-xl border border-red-300 bg-red-50 p-6">
      <div className="flex items-center gap-3">
        <XCircle className="text-red-600 w-6 h-6" />
        <div>
          <div className="text-sm text-red-700 font-medium">
            Errored Sales
          </div>
          <div className="text-2xl font-bold text-red-800">
            {salesSummary.errored}
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-yellow-600 w-6 h-6" />
        <div>
          <div className="text-sm text-yellow-700 font-medium">
            Needs Attention
          </div>
          <div className="text-2xl font-bold text-yellow-800">
            {salesSummary.needsAttention}
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Table */}
  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-700">
        <tr>
          <th className="px-4 py-3 text-left">Company</th>
          <th className="px-4 py-3 text-left">Bill No</th>
          <th className="px-4 py-3 text-left">Status</th>
          <th className="px-4 py-3 text-left">Info</th>
        </tr>
      </thead>

      <tbody>
        {salesData.length === 0 && (
          <tr>
            <td
              colSpan="4"
              className="px-4 py-6 text-center text-gray-500"
            >
              No sales require attention 🎉
            </td>
          </tr>
        )}

        {salesData.map((sale, idx) => (
          <tr key={idx} className="border-t hover:bg-gray-50">
            <td className="px-4 py-3">
              {sale.companyName}
            </td>

            <td className="px-4 py-3 font-medium">
              {sale.billNo}
            </td>

            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1
                  rounded-full border text-xs font-semibold
                  ${
                    sale.type === "errored"
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }
                `}
              >
                {sale.type === "errored" ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {sale.type === "errored"
                  ? "Errored"
                  : "Needs Attention"}
              </span>
            </td>

            <td className="px-4 py-3 text-gray-600">
              {sale.type === "needs_attention" ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Stuck for{" "}
                  <strong>
                    {Math.floor(sale.stuckForSeconds / 60)}m{" "}
                    {sale.stuckForSeconds % 60}s
                  </strong>
                </span>
              ) : (
                "-"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      </div>
    </div>
  );
}
