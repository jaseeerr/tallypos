import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

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
              <Link to="/" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
              <Link to="/products" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Inventory</Link>
              <Link to="/sale" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Add New Sale</Link>
                            {/* <Link to="/listSales" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Sales</Link> */}

              {/* <Link to="/purchase" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Purchases</Link> */}
                            <Link to="/api-doc" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">API Documentation</Link>
                            <Link to="/workflow" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">WorkFlow Documentation</Link>

            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
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

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden px-2 pb-3 space-y-1 sm:px-3">
          <Link to="/" onClick={() => setIsOpen(false)} className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">Home</Link>
          <Link to="/products" onClick={() => setIsOpen(false)} className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">Products</Link>
          <Link to="/sale" onClick={() => setIsOpen(false)} className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">Sales</Link>
          <Link to="/purchase" onClick={() => setIsOpen(false)} className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">Purchases</Link>
                <Link to="/api" onClick={() => setIsOpen(false)} className="block hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">API Documentation</Link>

        </div>
      )}
    </nav>
  )
}

export default Navbar
