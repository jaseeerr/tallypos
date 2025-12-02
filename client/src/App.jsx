import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Navbar from './components/Navbar' // make sure path matches your folder
import Workflow from './pages/Workflow'
import TallyApiDoc from './pages/Apidoc'
import SalesList from './pages/SalesList'
import Customers from './pages/Customers'
import ViewSale from './pages/ViewSale'
import CreateSaleOrder from './pages/CreateSaleOrder'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<SalesList />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sale" element={<Sales />} />
                        <Route path="/sale/:billNo" element={<ViewSale />} />

                        <Route path="/listSales" element={<SalesList />} />

                                    <Route path="/addSaleOrder" element={<CreateSaleOrder />} />

                                                <Route path="/customers" element={<Customers />} />


            <Route path="/purchase" element={<Purchases />} />
                        <Route path="/api-doc" element={<TallyApiDoc />} />
                        <Route path="/workflow" element={<Workflow />} />

          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
