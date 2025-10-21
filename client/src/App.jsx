import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Navbar from './components/Navbar' // make sure path matches your folder

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sale" element={<Sales />} />
            <Route path="/purchase" element={<Purchases />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
