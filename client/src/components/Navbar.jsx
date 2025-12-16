"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Home, ShoppingCart, Users,Package, LogOut,BadgeDollarSign,ScrollText,ReceiptText, Plus,FilePlusCorner, Eye,Menu, ChevronDown } from "lucide-react"

function BottomNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  const navigate = useNavigate()

  const navList = [
    { name: "Dashboard", path: "/", icon: Home, color: "from-slate-600 to-slate-800" },
    {
      name: "Sales",
      icon: ReceiptText,
      color: "from-green-600 to-indigo-600",
      subItems: [
        { name: "View Sales", path: "/listSales", icon: Eye },
        { name: "Add Sale", path: "/sale", icon: Plus },
      ],
    },
    {
      name: "Orders",
      icon: ReceiptText,
      color: "from-indigo-600 to-purple-600",
      subItems: [
        { name: "View Orders", path: "/listSaleOrders", icon: Eye },
        { name: "Add Order", path: "/addSaleOrder", icon: Plus },
      ],
    },
    { name: "Inventory", path: "/products", icon: Package, color: "from-blue-600 to-indigo-600" },
        { name: "Customers", path: "/customers", icon: Users, color: "from-blue-600 to-indigo-600" },

        { name: "Cart", path: "/cart", icon: ShoppingCart, color: "from-slate-600 to-indigo-800" },

  ]

  const handleLogout = () => {
    localStorage.removeItem("token")
    setIsMenuOpen(false)
    setExpandedItem(null)
    navigate("/auth")
  }

  const handleNavigation = (path) => {
    navigate(path)
    setIsMenuOpen(false)
    setExpandedItem(null)
  }

  const handleParentClick = (itemName) => {
    setExpandedItem(expandedItem === itemName ? null : itemName)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setExpandedItem(null)
  }

  return (
    <>
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={closeMenu}
        />
      )}

      {isMenuOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="divide-y divide-slate-200/60">
              {navList.map((item, index) => {
                const Icon = item.icon
                const hasSubItems = item.subItems?.length
                const isExpanded = expandedItem === item.name

                return (
                  <div
                    key={item.name}
                    className="opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <button
                      onClick={() =>
                        hasSubItems
                          ? handleParentClick(item.name)
                          : handleNavigation(item.path)
                      }
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition"
                    >
                      <div
                        className={`bg-gradient-to-br ${item.color} p-3 rounded-xl shadow-md`}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>

                      <span className="flex-1 text-left text-sm font-semibold text-slate-800">
                        {item.name}
                      </span>

                      {hasSubItems && (
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {hasSubItems && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="bg-slate-50 px-5 py-2 space-y-1">
                          {item.subItems.map((sub) => {
                            const SubIcon = sub.icon
                            return (
                              <button
                                key={sub.path}
                                onClick={() => handleNavigation(sub.path)}
                                className="w-full px-4 py-3 flex items-center gap-3 rounded-xl hover:bg-white transition"
                              >
                                <div className="bg-slate-200 p-2 rounded-lg">
                                  <SubIcon className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="text-xs font-medium text-slate-700">
                                  {sub.name}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={handleLogout}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-red-50 transition"
              >
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl shadow-md">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-red-600">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 shadow-sm">
          <div className="h-16 flex items-center justify-around max-w-md mx-auto px-8">
            <button
              onClick={() => navigate("/sale")}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[11px] font-medium">New Sale</span>
            </button>

            <div className="absolute left-1/2 -translate-x-1/2 -top-7">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all ${
                  isMenuOpen
                    ? "bg-gradient-to-br from-blue-700 to-indigo-700 rotate-90 scale-110"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-105"
                }`}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>

            <button
              onClick={() => navigate("/addSaleOrder")}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition"
            >
              <FilePlusCorner className="w-5 h-5" />
              <span className="text-[11px] font-medium">New Order</span>
            </button>
          </div>
        </div>
      </nav>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

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
