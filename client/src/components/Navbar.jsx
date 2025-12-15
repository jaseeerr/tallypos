"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Home, ShoppingCart, Package, Users, Menu, X, FileText, GitBranch, LogOut, Plus } from "lucide-react"

function BottomNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navList = [
    { name: "Home", path: "/", icon: Home },
    { name: "New Order", path: "/addSaleOrder", icon: ShoppingCart },
    { name: "Sale Orders", path: "/listSaleOrders", icon: ShoppingCart },
    { name: "Inventory", path: "/products", icon: Package },
    { name: "Add New Sale", path: "/sale", icon: Plus },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "API Docs", path: "/api-doc", icon: FileText },
    { name: "Workflow", path: "/workflow", icon: GitBranch },
  ]

  const handleLogout = () => {
    localStorage.removeItem("token")
    setIsMenuOpen(false)
    navigate("/auth")
  }

  const handleNavigation = (path) => {
    navigate(path)
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Overlay when menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Grid Menu Popup */}
      {isMenuOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-2xl p-6 animate-[scaleIn_0.3s_ease-out] border border-gray-100">
            {/* Menu Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {navList.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className="group bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 rounded-2xl p-4 transition-all duration-300 flex flex-col items-center gap-2 hover:scale-105 hover:shadow-lg border border-gray-200 hover:border-blue-200 animate-[fadeIn_0.4s_ease-out]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-xs text-center leading-tight group-hover:text-blue-600 transition-colors duration-300">
                      {item.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Logout Button - Full Width */}
            <button
              onClick={handleLogout}
              className="group w-full bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 rounded-2xl px-6 py-4 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 hover:shadow-lg border border-red-200 animate-[fadeIn_0.4s_ease-out]"
              style={{ animationDelay: `${navList.length * 40}ms` }}
            >
              <div className="bg-gradient-to-br from-red-500 to-pink-600 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-800 font-semibold text-sm group-hover:text-red-600 transition-colors duration-300">
                Logout
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="relative bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="h-16 flex items-center justify-around px-4 max-w-md mx-auto">
            {/* Quick Access Button - Home */}
            <button
              onClick={() => navigate("/")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <Home className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
              <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors duration-200 font-medium">
                Home
              </span>
            </button>

            {/* Floating Circle Menu Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-8">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
                  isMenuOpen
                    ? "bg-gradient-to-br from-purple-600 to-blue-600 scale-110 rotate-90"
                    : "bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105"
                }`}
              >
                {isMenuOpen ? (
                  <X className="w-7 h-7 text-white transition-transform duration-300" />
                ) : (
                  <Menu className="w-7 h-7 text-white transition-transform duration-300" />
                )}
              </button>
            </div>

            {/* Quick Access Button - Customers */}
            <button
              onClick={() => navigate("/customers")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <Users className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
              <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors duration-200 font-medium">
                Customers
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Custom animations */}
      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Safe area for iOS devices */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </>
  )
}

export default BottomNavbar
