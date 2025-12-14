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
    { name: "Inventory", path: "/products", icon: Package },
    { name: "Add New Sale", path: "/sale", icon: Plus },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "API Documentation", path: "/api-doc", icon: FileText },
    { name: "WorkFlow Documentation", path: "/workflow", icon: GitBranch },
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Radial Menu Popup */}
      {isMenuOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="relative">
            {/* Menu Items in a vertical stack */}
            <div className="flex flex-col gap-2 items-center animate-[slideUp_0.3s_ease-out]">
              {navList.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className="group bg-white hover:bg-blue-50 rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 min-w-[240px] animate-[fadeIn_0.3s_ease-out] border border-gray-100"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl group-hover:scale-110 transition-transform duration-200">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-800 font-medium text-sm">{item.name}</span>
                  </button>
                )
              })}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="group bg-white hover:bg-red-50 rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 min-w-[240px] animate-[fadeIn_0.3s_ease-out] border border-gray-100"
                style={{ animationDelay: `${navList.length * 30}ms` }}
              >
                <div className="bg-gradient-to-br from-red-500 to-pink-600 p-2 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-800 font-medium text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        {/* White navbar background - half height of circle */}
        <div className="relative bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="h-16 flex items-center justify-around px-4 max-w-md mx-auto">
            {/* Quick Access Button - Home */}
            <button
              onClick={() => navigate("/")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <Home className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
              <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                Home
              </span>
            </button>

            {/* Floating Circle Menu Button - positioned to overlap */}
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
              <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                Customers
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Custom animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
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
