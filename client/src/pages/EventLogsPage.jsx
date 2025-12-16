import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Clock,
  Building2,
  Calendar
} from "lucide-react";
import MyAxiosInstance from "../utils/axios";

const axios = MyAxiosInstance();

export default function EventLogsPage() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const observerRef = useRef(null);

  // -------------------------------
  // Fetch logs
  // -------------------------------
  const fetchLogs = async (pageToLoad, reset = false) => {
    if (loading || (!hasMore && !reset)) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.get("/getEventLogs", {
        params: {
          page: pageToLoad,
          limit: 20,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        }
      });

      const newLogs = res.data.logs || [];

      setLogs((prev) => {
        if (reset) return newLogs;

        const seen = new Set(prev.map((l) => l.eventId));
        const filtered = newLogs.filter(
          (l) => !seen.has(l.eventId)
        );
        return [...prev, ...filtered];
      });

      setHasMore(newLogs.length === 20);
    } catch (err) {
      setError(err.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // Initial load
  // -------------------------------
  useEffect(() => {
    fetchLogs(1, true);
  }, []);

  // -------------------------------
  // Refetch on date change
  // -------------------------------
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLogs(1, true);
  }, [startDate, endDate]);

  // -------------------------------
  // Infinite scroll observer
  // -------------------------------
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading
        ) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchLogs(nextPage);
        }
      },
      { threshold: 1 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [observerRef, page, hasMore, loading]);

  // -------------------------------
  // Helpers
  // -------------------------------
  const StatusIcon = ({ status }) =>
    status === "success" ? (
      <CheckCircle className="text-green-500 w-5 h-5" />
    ) : (
      <XCircle className="text-red-500 w-5 h-5" />
    );

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Database className="w-6 h-6" />
        Event Logs
      </h1>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="text-sm font-medium flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Logs */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div
            key={`${log.eventId}-${log.timestamp}`}
            className="border rounded-lg p-4 bg-white shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={log.status} />
                <span className="font-semibold capitalize">
                  {log.module} • {log.action}
                </span>
              </div>

              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Company:</span>
                <span>{log.company}</span>
              </div>

              <div>
                <span className="font-medium">Source:</span>{" "}
                {log.source}
              </div>

              <div>
                <span className="font-medium">Stage:</span>{" "}
                <span className="capitalize">
                  {log.stage === "fetch" && "Tally Fetch"}
                  {log.stage === "hash" && "Hash Check"}
                  {log.stage === "sync" && "External Sync"}
                </span>
              </div>

              <div>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={
                    log.status === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {log.status}
                </span>
              </div>

              <div>
                <span className="font-medium">Event ID:</span>{" "}
                <span className="break-all">{log.eventId}</span>
              </div>

              <div>
                <span className="font-medium">Module:</span>{" "}
                {log.module}
              </div>
            </div>

            {/* Message */}
            <div className="mt-3">
              <span className="font-medium">Message:</span>
              <p className="text-gray-800">{log.message}</p>
            </div>

            {/* Details */}
            <div className="mt-3">
              <span className="font-medium">Details:</span>
              <pre className="mt-1 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>

            {/* DB timestamps */}
            <div className="mt-3 text-xs text-gray-500">
              {log.createdAt && (
                <div>
                  Created At:{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              )}
              {log.updatedAt && (
                <div>
                  Updated At:{" "}
                  {new Date(log.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-10" />

      {/* End */}
      {!hasMore && (
        <div className="text-center text-gray-500 mt-4">
          No more logs
        </div>
      )}
    </div>
  );
}
