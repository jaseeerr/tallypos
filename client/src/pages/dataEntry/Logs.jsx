import { useEffect, useState } from "react"
import MyAxiosInstance from "../../utils/axios"

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    const axiosInstance = MyAxiosInstance()

    async function fetchLogs() {
      try {
        setLoading(true)
        const res = await axiosInstance.get("/dataEntry/logs")
        console.log("Data entry logs:", res.data)

        if (isMounted) {
          setLogs(res.data?.items || [])
        }
      } catch (err) {
        console.error("Fetch data entry logs error:", err)
        if (isMounted) {
          setError("Failed to load logs.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Data Entry Logs</h1>

        {loading && (
          <div className="text-slate-500">Loading logs...</div>
        )}

        {!loading && error && (
          <div className="text-red-600">{error}</div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="text-slate-500">No logs found.</div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-100">
              <div className="col-span-3">Inventory</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Timestamp</div>
              <div className="col-span-2">Details</div>
            </div>
            {logs.map((log) => (
              <div
                key={log._id}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-t border-slate-100 text-sm"
              >
                <div className="col-span-3 truncate text-slate-700">
                  {log.inventoryId}
                </div>
                <div className="col-span-2 text-slate-700">{log.action}</div>
                <div className="col-span-2 text-slate-700">{log.status}</div>
                <div className="col-span-3 text-slate-600">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                </div>
                <div className="col-span-2 text-slate-600 truncate">
                  {log.errorMessage || (log.updatedFields?.length ? `Fields: ${log.updatedFields.join(", ")}` : "-")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
