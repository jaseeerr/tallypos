import { BrowserRouter as Router, Routes, Route, Navigate, } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Navbar from './components/Navbar'

import Home from './pages/Home'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Workflow from './pages/Workflow'
import TallyApiDoc from './pages/Apidoc'
import SalesList from './pages/SalesList'
import Customers from './pages/Customers'
import ViewSale from './pages/ViewSale'
import CreateSaleOrder from './pages/CreateSaleOrder'
import Auth from './pages/Auth'
import EditSale from './pages/EditSale'
import SaleOrdersList from './pages/ListSaleOrders'
import ViewOrder from './pages/ViewSaleOrder'

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null)

  // update token state when localStorage changes (e.g., logout)
  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem("token"))
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const isAuthed = Boolean(token)

  return (
    <Router>
      <div className="min-h-screen flex flex-col">

        {/* Hide Navbar on auth page */}
        {isAuthed && <Navbar />}

        <div className="flex-grow mb-10">
          <Routes>

            {/* Auth Page (Accessible without login) */}
            <Route
              path="/auth"
              element={isAuthed ? <Navigate to="/" replace /> : <Auth />}
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={isAuthed ? <SalesList /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/products"
              element={isAuthed ? <Products /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/sale"
              element={isAuthed ? <Sales /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/sale/:billNo"
              element={isAuthed ? <ViewSale /> : <Navigate to="/auth" replace />}
            />
             <Route
              path="/editSale/:billNo"
              element={isAuthed ? <EditSale /> : <Navigate to="/auth" replace />}
            />

            <Route
              path="/listSales"
              element={isAuthed ? <SalesList /> : <Navigate to="/auth" replace />}
            />

             <Route
              path="/listSaleOrders"
              element={isAuthed ? <SaleOrdersList /> : <Navigate to="/auth" replace />}
            />

              <Route
              path="/viewOrder/:id"
              element={isAuthed ? <ViewOrder /> : <Navigate to="/auth" replace />}
            />

            <Route
              path="/addSaleOrder"
              element={isAuthed ? <CreateSaleOrder /> : <Navigate to="/auth" replace />}
            />

            <Route
              path="/customers"
              element={isAuthed ? <Customers /> : <Navigate to="/auth" replace />}
            />

            <Route
              path="/purchase"
              element={isAuthed ? <Purchases /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/api-doc"
              element={isAuthed ? <TallyApiDoc /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/workflow"
              element={isAuthed ? <Workflow /> : <Navigate to="/auth" replace />}
            />

            {/* Catch-all Undefined Route Handler */}
            <Route
              path="*"
              element={
                isAuthed ? <Navigate to="/" replace /> : <Navigate to="/auth" replace />
              }
            />

          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
