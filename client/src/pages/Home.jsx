import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Activity
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


  // Initial fetch
  useEffect(() => {
    fetchHealth();
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
      </div>
    </div>
  );
}
