import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import ProductList from './components/ProductList'
import ProductDetail from './components/ProductDetail'
import Cart from './components/Cart'
import Login from './components/Login'
import Register from './components/Register'
import UserProfile from './components/UserProfile'
import OrderHistory from './components/OrderHistory'
import AdminDashboard from './components/AdminDashboard'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/orders" 
                element={
                  <ProtectedRoute>
                    <OrderHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

// Komponent për rrugët e mbrojtura
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

// Komponent për rrugët e adminit
function AdminRoute({ children }) {
  const { user } = useAuth()
  return user && user.role === 'admin' ? children : <Navigate to="/" />
}

export default App