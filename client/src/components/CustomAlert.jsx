"use client"

import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

const THEMES = {
  success: {
    icon: CheckCircle,
    bg: "from-emerald-500 to-emerald-600",
    text: "text-emerald-600",
  },
  error: {
    icon: XCircle,
    bg: "from-red-500 to-red-600",
    text: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "from-amber-500 to-amber-600",
    text: "text-amber-600",
  },
  message: {
    icon: Info,
    bg: "from-blue-500 to-blue-600",
    text: "text-blue-600",
  },
}

export default function CustomAlert({
  open,
  type = "message",
  title = "Message",
  message = "",
  onClose,
}) {
  if (!open) return null

  const ThemeIcon = THEMES[type]?.icon || Info

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 animate-scaleIn">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 rounded-t-2xl bg-gradient-to-r ${THEMES[type].bg}`}
        >
          <div className="flex items-center gap-2 text-white font-bold">
            <ThemeIcon className="w-5 h-5" />
            {title}
          </div>

          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <p className="text-gray-700 leading-relaxed">{message}</p>

          <button
            onClick={onClose}
            className={`mt-6 w-full py-3 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 transition ${THEMES[type].text}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
