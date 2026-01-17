"use client"

import { useEffect, useState, useRef } from "react"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
  RefreshCcw,
  Clock,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react"

import Scanner from "../components/Scanner"


// Note: You'll need to update this path to match your axios instance location
import MyAxiosInstance from "../utils/axios";

const companies = ["AMANA-FIRST-TRADING-LLC", "FANCY-PALACE-TRADING-LLC"]

const modules = ["customers", "inventory"]
const POLL_INTERVAL = 5

function HeartbeatMonitor({ isLive, company, module }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const offsetRef = useRef(0)
  const patternRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const centerY = height / 2

    // Generate a seamless repeating pattern
    const generateHeartbeatPattern = () => {
      const points = []

      if (isLive) {
        // Realistic ECG pattern that repeats seamlessly
        let x = 0
        const patternWidth = 600 // Increased pattern width for smoother loop

        while (x < patternWidth) {
          // Baseline with slight variation
          const baselineLength = 80 + Math.random() * 20
          for (let i = 0; i < baselineLength; i++) {
            points.push({ x: x + i, y: centerY + (Math.random() - 0.5) * 1.5 })
          }
          x += baselineLength

          // P wave (small rounded bump)
          const pWaveWidth = 20
          const pWaveHeight = 8 + Math.random() * 4
          for (let i = 0; i < pWaveWidth; i++) {
            const progress = i / pWaveWidth
            const y = centerY - Math.sin(progress * Math.PI) * pWaveHeight
            points.push({ x: x + i, y })
          }
          x += pWaveWidth

          // PR segment (flat)
          const prLength = 30 + Math.random() * 10
          for (let i = 0; i < prLength; i++) {
            points.push({ x: x + i, y: centerY + (Math.random() - 0.5) * 0.8 })
          }
          x += prLength

          // QRS complex (sharp spike)
          const qDepth = 10 + Math.random() * 5
          const rHeight = 40 + Math.random() * 15
          const sDepth = 15 + Math.random() * 5

          const qrsPoints = [
            { dx: 0, dy: 0 },
            { dx: 3, dy: qDepth }, // Q dip
            { dx: 6, dy: -rHeight }, // R spike
            { dx: 9, dy: sDepth }, // S dip
            { dx: 12, dy: 0 }, // Back to baseline
          ]
          qrsPoints.forEach((point) => {
            points.push({ x: x + point.dx, y: centerY + point.dy })
          })
          x += 15

          // ST segment
          const stLength = 35 + Math.random() * 15
          for (let i = 0; i < stLength; i++) {
            points.push({ x: x + i, y: centerY + (Math.random() - 0.5) * 1.2 })
          }
          x += stLength

          // T wave (rounded)
          const tWaveWidth = 30
          const tWaveHeight = 15 + Math.random() * 8
          for (let i = 0; i < tWaveWidth; i++) {
            const progress = i / tWaveWidth
            const y = centerY - Math.sin(progress * Math.PI) * tWaveHeight
            points.push({ x: x + i, y })
          }
          x += tWaveWidth
        }

        const firstPointY = points[0].y
        const lastPointY = points[points.length - 1].y
        const bridgeLength = 20
        for (let i = 0; i < bridgeLength; i++) {
          const progress = i / bridgeLength
          const y = lastPointY + (firstPointY - lastPointY) * progress
          points.push({ x: x + i, y })
        }
      } else {
        // Erratic, chaotic pattern for broken status with more dramatic movement
        let x = 0
        const patternWidth = 600

        while (x < patternWidth) {
          const segmentType = Math.random()

          if (segmentType < 0.25) {
            // Rapid fibrillation with more chaos
            const fibLength = 25 + Math.random() * 25
            for (let i = 0; i < fibLength; i++) {
              const y = centerY + (Math.random() - 0.5) * 25 + Math.sin(i * 1.2) * 12 + Math.cos(i * 0.7) * 8
              points.push({ x: x + i, y })
            }
            x += fibLength
          } else if (segmentType < 0.5) {
            // Random dramatic spikes
            const spikeHeight = (Math.random() - 0.5) * 70
            const spikeWidth = 8 + Math.random() * 15
            for (let i = 0; i < spikeWidth; i++) {
              const progress = i / spikeWidth
              const y = centerY + Math.sin(progress * Math.PI * 2) * spikeHeight
              points.push({ x: x + i, y })
            }
            x += spikeWidth
          } else if (segmentType < 0.75) {
            // Irregular oscillations
            const oscLength = 30 + Math.random() * 30
            const amplitude = 15 + Math.random() * 15
            for (let i = 0; i < oscLength; i++) {
              const y =
                centerY +
                Math.sin(i * 0.5) * amplitude +
                Math.cos(i * 0.3) * (amplitude * 0.5) +
                (Math.random() - 0.5) * 8
              points.push({ x: x + i, y })
            }
            x += oscLength
          } else {
            // Erratic baseline with jitter
            const baseLength = 20 + Math.random() * 30
            for (let i = 0; i < baseLength; i++) {
              const y = centerY + (Math.random() - 0.5) * 18 + Math.sin(i * 0.4) * 8
              points.push({ x: x + i, y })
            }
            x += baseLength
          }
        }

        const firstPointY = points[0].y
        const lastPointY = points[points.length - 1].y
        const bridgeLength = 15
        for (let i = 0; i < bridgeLength; i++) {
          const progress = i / bridgeLength
          const y = lastPointY + ((firstPointY - lastPointY) * (Math.sin(progress * Math.PI - Math.PI / 2) + 1)) / 2
          points.push({ x: x + i, y })
        }
      }

      return points
    }

    patternRef.current = generateHeartbeatPattern()
    const patternWidth = patternRef.current[patternRef.current.length - 1].x

    // Regenerate pattern periodically for variation
    const regenerateInterval = setInterval(
      () => {
        const newPattern = generateHeartbeatPattern()
        patternRef.current = newPattern
      },
      isLive ? 4000 : 3000,
    )

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Update offset for scrolling
      offsetRef.current += isLive ? 2 : 2.8
      if (offsetRef.current > patternWidth) {
        offsetRef.current = 0
      }

      // Draw the pattern with seamless looping
      ctx.strokeStyle = isLive ? "#10b981" : "#ef4444"
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Draw first instance
      ctx.beginPath()
      let started = false
      patternRef.current.forEach((point) => {
        const x = point.x - offsetRef.current
        if (x >= -10 && x <= width + 10) {
          if (!started) {
            ctx.moveTo(x, point.y)
            started = true
          } else {
            ctx.lineTo(x, point.y)
          }
        }
      })
      ctx.stroke()

      // Draw second instance (for seamless loop)
      ctx.beginPath()
      started = false
      patternRef.current.forEach((point) => {
        const x = point.x + patternWidth - offsetRef.current
        if (x >= -10 && x <= width + 10) {
          if (!started) {
            ctx.moveTo(x, point.y)
            started = true
          } else {
            ctx.lineTo(x, point.y)
          }
        }
      })
      ctx.stroke()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      clearInterval(regenerateInterval)
    }
  }, [isLive])

  return (
    <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-white rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id={`grid-${company}-${module}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isLive ? "#10b981" : "#ef4444"} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${company}-${module})`} />
        </svg>
      </div>

      {/* Company and Module Info */}
      <div className="absolute top-3 left-4 z-10">
        <div className={`text-xs font-mono font-bold tracking-wide ${isLive ? "text-green-600" : "text-red-600"}`}>
          {company.replace(/-/g, " ")}
        </div>
        <div className={`text-[10px] font-mono uppercase mt-1 ${isLive ? "text-green-500" : "text-red-500"}`}>
          {module}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-red-500 animate-pulse"}`}
        />
        <span className={`text-xs font-mono font-bold ${isLive ? "text-green-600" : "text-red-600"}`}>
          {isLive ? "LIVE" : "BROKEN"}
        </span>
      </div>

      {/* Canvas for heartbeat animation */}
      <canvas ref={canvasRef} width={1200} height={128} className="absolute inset-0 w-full h-full" />
    </div>
  )
}

function ConfirmationModal({ isOpen, onClose, onConfirm, billNo }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (isOpen) {
      setCountdown(3)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 animate-scaleIn">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <RotateCcw className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Retry</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to retry bill <span className="font-bold text-blue-600">{billNo}</span>?
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={countdown > 0}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            {countdown > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {countdown}s
              </span>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  // Uncomment and use your actual axios instance
  const axiosInstance = MyAxiosInstance();

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesSummary, setSalesSummary] = useState({
    errored: 0,
    needsAttention: 0,
  })
  const [salesData, setSalesData] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBillNo, setSelectedBillNo] = useState(null)
  const [erroredMinimized, setErroredMinimized] = useState(true)
  const [needsAttentionMinimized, setNeedsAttentionMinimized] = useState(true)

  const fetchHealth = async () => {
    setLoading(true)

    try {
      // Replace with your actual API call
      const res = await axiosInstance.get("/fetch-health");
      setData(res.data?.data || {});

    
    } catch (err) {
      console.error("Health fetch failed", err.response?.data || err.message)
    } finally {
      setLoading(false)
      setCountdown(POLL_INTERVAL)
    }
  }

  const fetchSalesAttention = async () => {
    setSalesLoading(true)
    try {
      // Replace with your actual API call
      const res = await axiosInstance.get("/sales-attention");
      setSalesSummary(res.data.summary || {});
      setSalesData(res.data.data || []);

      
    } catch (err) {
      console.error("Sales attention fetch failed", err.response?.data || err.message)
    } finally {
      setSalesLoading(false)
    }
  }

  const handleRetryClick = (billNo) => {
    setSelectedBillNo(billNo)
    setModalOpen(true)
  }

  const handleConfirmRetry = async () => {
    try {
      // Replace with your actual API call
      await axiosInstance.post("/reset-sales-status", {
        billNos: [selectedBillNo]
      });

      setModalOpen(false)
      setSelectedBillNo(null)
      fetchSalesAttention()
    } catch (err) {
      console.error("Failed to retry sale", err.response?.data || err.message)
    }
  }

  const erroredSales = salesData.filter((sale) => sale.type === "errored")
  const needsAttentionSales = salesData.filter((sale) => sale.type === "needs_attention")

  // Initial fetch
  useEffect(() => {
    fetchHealth()
  }, [])

  useEffect(() => {
    fetchSalesAttention()
  }, [])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          fetchHealth()
          return POLL_INTERVAL
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])


  const isFlutter = !!window.__IS_FLUTTER_APP__;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8 mb-2  ">
     <div className={`max-w-7xl mx-auto ${isFlutter === true ? "mt-[10px]" : "mt-0"}`}>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8 lg:mb-10">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl border border-blue-400">
            <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Tally Health Monitor
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-2 leading-relaxed">
              Real-time system status tracking 
            </p>
          </div>
        </div>

        <div className="hidden bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-6 mb-8 lg:mb-10 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-600" />
                  <span className="text-gray-700 text-sm sm:text-base font-medium">Scanning system health...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  <span className="text-gray-700 text-sm sm:text-base font-medium">System verified</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700 text-sm">
                Next check in <span className="font-bold text-blue-600">{countdown}s</span>
              </span>
            </div>
          </div>
        </div>

{/* Scan Product Section */}
<div className="mb-8">
  <Scanner />
</div>

        {/* Heartbeat Monitors Grid - improved mobile responsiveness */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-10 lg:mb-12">
          {companies.map((company) =>
            modules.map((module) => {
              const status = data?.[company]?.[module]
              const isLive = status?.state === "live"

              return (
                <div
                  key={`${company}-${module}`}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-6 hover:border-blue-300 transition-all shadow-lg hover:shadow-xl"
                >
                  <HeartbeatMonitor isLive={isLive} company={company} module={module} />

                  {status?.lastChecked && (
                    <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )
            }),
          )}
        </div>

        <div className="space-y-6 lg:space-y-8">
          <div className="bg-white border-2 border-red-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-b-2 border-red-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-red-500 rounded-xl shadow-lg">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Errored Sales</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-bold text-red-600">{salesSummary.errored}</span> item
                      {salesSummary.errored !== 1 ? "s" : ""} need attention
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                  
                    onClick={fetchSalesAttention}
                    disabled={salesLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl
                      bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold
                      hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <RefreshCcw className={`w-4 h-4 ${salesLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setErroredMinimized(!erroredMinimized)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl
                      border-2 border-gray-300 text-gray-700 text-sm font-semibold
                      hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-95"
                  >
                    {erroredMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!erroredMinimized && (
              <div className="p-4 sm:p-6">
                {erroredSales.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-base sm:text-lg font-medium">No errored sales</p>
                    <p className="text-gray-500 text-sm mt-2">All systems running smoothly</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {erroredSales.map((sale, idx) => (
                      <div
                        key={idx}
                        className="group bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className="p-2 bg-red-500 rounded-lg shadow-md">
                              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base sm:text-lg text-gray-900 mb-1 truncate">
                                {sale.billNo}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600 truncate">{sale.companyName}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRetryClick(sale.billNo)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3
                              text-sm font-semibold rounded-xl
                              bg-gradient-to-r from-blue-600 to-blue-700 text-white
                              hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-xl overflow-hidden mb-20">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b-2 border-amber-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-amber-500 rounded-xl shadow-lg">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Needs Attention</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-bold text-amber-600">{salesSummary.needsAttention}</span> item
                      {salesSummary.needsAttention !== 1 ? "s" : ""} require review
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                  
                    onClick={fetchSalesAttention}
                    disabled={salesLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl
                      bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold
                      hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <RefreshCcw className={`w-4 h-4 ${salesLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setNeedsAttentionMinimized(!needsAttentionMinimized)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl
                      border-2 border-gray-300 text-gray-700 text-sm font-semibold
                      hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-95"
                  >
                    {needsAttentionMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!needsAttentionMinimized && (
              <div className="p-4 sm:p-6">
                {needsAttentionSales.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-base sm:text-lg font-medium">No items need attention</p>
                    <p className="text-gray-500 text-sm mt-2">Everything is under control</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {needsAttentionSales.map((sale, idx) => (
                      <div
                        key={idx}
                        className="group bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className="p-2 bg-amber-500 rounded-lg shadow-md">
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base sm:text-lg text-gray-900 mb-1 truncate">
                                {sale.billNo}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{sale.companyName}</div>
                              <div className="text-xs text-amber-600 font-medium">
                                Stuck for {Math.floor(sale.stuckForSeconds / 60)}m {sale.stuckForSeconds % 60}s
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRetryClick(sale.billNo)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3
                              text-sm font-semibold rounded-xl
                              bg-gradient-to-r from-blue-600 to-blue-700 text-white
                              hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmRetry}
        billNo={selectedBillNo}
      />
    </div>
  )
}
