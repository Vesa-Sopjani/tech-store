// frontend/src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiLogOut, FiPackage, FiBarChart2, FiSettings } from 'react-icons/fi';

const Header = ({ user, cartItemCount, logoutUser, isAdmin }) => {
  const navigate = useNavigate();

  return (
    <header className="glass-effect sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur group-hover:blur-md transition duration-300"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <span className="text-white text-2xl">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TechStore
              </h1>
              <p className="text-xs text-gray-500">Premium Electronics</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Products
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                  <FiSettings className="inline mr-1" />
                  Admin
                </Link>
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-6">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiShoppingCart className="text-xl text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/profile" className="flex items-center space-x-2 px-4 py-3 hover:bg-purple-50">
                    <FiUser />
                    <span>Profile</span>
                  </Link>
                  <Link to="/orders" className="flex items-center space-x-2 px-4 py-3 hover:bg-purple-50">
                    <FiPackage />
                    <span>Orders</span>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin/analytics" className="flex items-center space-x-2 px-4 py-3 hover:bg-purple-50">
                      <FiBarChart2 />
                      <span>Analytics</span>
                    </Link>
                  )}
                  <button 
                    onClick={logoutUser}
                    className="flex items-center space-x-2 px-4 py-3 hover:bg-purple-50 w-full text-left text-red-600"
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="px-6 py-2 text-purple-600 hover:text-purple-700 font-medium">
                  Login
                </Link>
                <Link to="/register" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;