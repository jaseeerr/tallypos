import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // All routes stored in one array
  const navList = [
    { name: "Home", path: "/" },
    { name: "New Order", path: "/addSaleOrder" },
    { name: "Inventory", path: "/products" },
    { name: "Add New Sale", path: "/sale" },
    { name: "Customers", path: "/customers" },
    { name: "API Documentation", path: "/api-doc" },
    { name: "WorkFlow Documentation", path: "/workflow" },
  ];

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  // Redirect if no token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/auth");
  }, [navigate]);

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold">testApp</h2>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navList.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {item.name}
                </Link>
              ))}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium ml-4"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden px-2 pb-3 space-y-1">
          {navList.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
            >
              {item.name}
            </Link>
          ))}

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="block w-full text-left bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-base font-medium"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
