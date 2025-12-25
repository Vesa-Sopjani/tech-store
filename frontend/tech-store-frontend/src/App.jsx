// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CategoriesPage from './components/CategoryPage';

// Icons (You can install react-icons: npm install react-icons)
import { 
  FiShoppingCart, 
  FiUser, 
  FiLogOut, 
  FiLogIn, 
  FiUserPlus,
  FiHome,
  FiPackage,
  FiSearch,
  FiChevronRight,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiCheck,
  FiCreditCard,
  FiTruck,
  FiShield,
  FiStar,
  FiHeart,
  FiFilter,
  FiMenu,
  FiX,
  FiShoppingBag,
  FiBell,
  FiSettings,
  FiHelpCircle
} from 'react-icons/fi';

import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin,
  FaGoogle,
  FaApple,
  FaPaypal,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex
} from 'react-icons/fa';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Mock data for demonstration
const mockProducts = [
  {
    id: '1',
    name: 'Apple iPhone 15 Pro',
    description: 'Titanium design, A17 Pro chip, 48MP camera system',
    price: 999.99,
    category: 'Smartphones',
    rating: 4.8,
    reviews: 1250,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop',
    stock: 50,
    features: ['5G', 'Face ID', 'Pro Camera', 'iOS 17']
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'AI-powered smartphone with 200MP camera',
    price: 1199.99,
    category: 'Smartphones',
    rating: 4.7,
    reviews: 980,
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop',
    stock: 35,
    features: ['AI Features', 'S Pen', 'Nightography', 'Android 14']
  },
  {
    id: '3',
    name: 'MacBook Pro 16" M3 Max',
    description: 'Supercharged by M3 Max chip for extreme performance',
    price: 3499.99,
    category: 'Laptops',
    rating: 4.9,
    reviews: 620,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w-400&h=400&fit=crop',
    stock: 20,
    features: ['M3 Max Chip', '40-core GPU', '96GB RAM', 'Liquid Retina XDR']
  },
  {
    id: '4',
    name: 'Sony WH-1000XM5',
    description: 'Industry-leading noise cancellation headphones',
    price: 399.99,
    category: 'Audio',
    rating: 4.8,
    reviews: 2100,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    stock: 100,
    features: ['Noise Cancelling', '30hr Battery', 'Hi-Res Audio', 'Touch Controls']
  },
  {
    id: '5',
    name: 'DJI Mavic 3 Pro',
    description: 'Tri-camera drone with 4/3 CMOS Hasselblad camera',
    price: 2199.99,
    category: 'Drones',
    rating: 4.9,
    reviews: 450,
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=400&fit=crop',
    stock: 15,
    features: ['4K/120fps', '46min Flight', '15km Range', 'Omnidirectional Sensing']
  },
  {
    id: '6',
    name: 'PlayStation 5 Pro',
    description: 'Next-gen gaming console with 8K support',
    price: 699.99,
    category: 'Gaming',
    rating: 4.7,
    reviews: 3200,
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop',
    stock: 25,
    features: ['8K Gaming', '120fps', 'Ray Tracing', '825GB SSD']
  },
  {
    id: '7',
    name: 'Apple Watch Series 9',
    description: 'Smartwatch with advanced health monitoring',
    price: 429.99,
    category: 'Wearables',
    rating: 4.6,
    reviews: 1800,
    image: 'https://images.unsplash.com/photo-1434493650001-5d43a6fea0c0?w=400&h=400&fit=crop',
    stock: 75,
    features: ['ECG App', 'Blood Oxygen', 'GPS', 'Always-On Retina']
  },
  {
    id: '8',
    name: 'Samsung 55" OLED TV',
    description: '4K OLED Smart TV with Quantum Processor',
    price: 1499.99,
    category: 'TV & Home',
    rating: 4.8,
    reviews: 890,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
    stock: 30,
    features: ['OLED 4K', 'HDR10+', 'Smart TV', 'Game Mode']
  }
];

const categories = [
  { name: 'Smartphones', icon: '📱', count: 45 },
  { name: 'Laptops', icon: '💻', count: 32 },
  { name: 'Audio', icon: '🎧', count: 67 },
  { name: 'Wearables', icon: '⌚', count: 28 },
  { name: 'Gaming', icon: '🎮', count: 54 },
  { name: 'Cameras', icon: '📸', count: 23 },
  { name: 'TV & Home', icon: '📺', count: 39 },
  { name: 'Drones', icon: '🚁', count: 15 },
];

function App() {
  const [products, setProducts] = useState(mockProducts);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add to cart function
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success(`Added another ${product.name} to cart!`);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      toast.success(`${product.name} added to cart!`);
    }
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.info('Item removed from cart');
  };

  // Update quantity
  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  // Add to wishlist
  const toggleWishlist = (product) => {
    if (wishlist.find(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
      toast.info('Removed from wishlist');
    } else {
      setWishlist([...wishlist, product]);
      toast.success('Added to wishlist!');
    }
  };

  // Checkout function
  const checkout = () => {
    if (cart.length === 0) {
      toast.warning('Your cart is empty!');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      return;
    }

    toast.success('Order placed successfully!');
    setCart([]);
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      toast.info('Cart cleared');
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4">
          <div className="container mx-auto text-center text-sm">
            🚀 Free shipping on orders over $100 | 🔥 Limited time: Get 20% off with code TECH20
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="bg-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                  <FiShoppingBag className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TechHub
                  </h1>
                  <p className="text-xs text-gray-500">Premium Electronics Store</p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link to="/" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <FiHome />
                  <span>Home</span>
                </Link>
                <Link to="/products" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <FiPackage />
                  <span>Products</span>
                </Link>
                <Link to="/categories" className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <FiFilter />
                  <span>Categories</span>
                </Link>
                <Link to="/deals" className="text-red-600 hover:text-red-700 font-semibold transition-colors">
                  🔥 Hot Deals
                </Link>
              </div>

              {/* Search Bar */}
              <div className="hidden md:block flex-1 max-w-lg mx-8">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* User Actions */}
              <div className="flex items-center space-x-4">
                {/* Wishlist */}
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FiHeart className="text-xl text-gray-700" />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                {/* Cart */}
                <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FiShoppingCart className="text-xl text-gray-700" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {/* User Menu */}
                {isAuthenticated ? (
                  <div className="relative group">
                    <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <Link to="/profile" className="flex items-center space-x-2 px-4 py-3 hover:bg-gray-50">
                        <FiUser />
                        <span>Profile</span>
                      </Link>
                      <Link to="/orders" className="flex items-center space-x-2 px-4 py-3 hover:bg-gray-50">
                        <FiPackage />
                        <span>My Orders</span>
                      </Link>
                      <Link to="/settings" className="flex items-center space-x-2 px-4 py-3 hover:bg-gray-50">
                        <FiSettings />
                        <span>Settings</span>
                      </Link>
                      <button className="flex items-center space-x-2 px-4 py-3 hover:bg-gray-50 w-full text-left text-red-600">
                        <FiLogOut />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link to="/login" className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium">
                      Login
                    </Link>
                    <Link to="/register" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow">
                      Sign Up
                    </Link>
                  </div>
                )}

                {/* Mobile Menu Button */}
                <button 
                  className="md:hidden p-2"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
                </button>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden mt-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t">
              <div className="container mx-auto px-4 py-4 space-y-4">
                <Link to="/" className="block py-2 text-gray-700 hover:text-blue-600">Home</Link>
                <Link to="/products" className="block py-2 text-gray-700 hover:text-blue-600">Products</Link>
                <Link to="/categories" className="block py-2 text-gray-700 hover:text-blue-600">Categories</Link>
                <Link to="/deals" className="block py-2 text-red-600 font-semibold">Hot Deals</Link>
                <Link to="/cart" className="block py-2 text-gray-700 hover:text-blue-600">Cart</Link>
                <Link to="/orders" className="block py-2 text-gray-700 hover:text-blue-600">Orders</Link>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <Routes>
            {/* Home Page */}
            <Route path="/" element={
              <div className="space-y-12">
                {/* Hero Section */}
                <section className="rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white">
                  <div className="container mx-auto px-8 py-16">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                      <div>
                        <h1 className="text-5xl font-bold mb-6">
                          Discover the Future of <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Technology</span>
                        </h1>
                        <p className="text-xl text-gray-300 mb-8">
                          Shop the latest tech gadgets, premium electronics, and innovative devices with exclusive deals and fast delivery.
                        </p>
                        <div className="flex flex-wrap gap-4">
                          <Link to="/products" className="px-8 py-4 bg-white text-blue-900 rounded-full font-semibold hover:shadow-2xl transition-shadow">
                            Shop Now
                          </Link>
                          <Link to="/deals" className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-blue-900 transition-colors">
                            View Deals
                          </Link>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -top-6 -right-6 w-64 h-64 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                        <img 
                          src="https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop" 
                          alt="Tech Products"
                          className="relative rounded-2xl shadow-2xl"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Categories Section */}

                <section>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
                    <Link to="/categories" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                      View All <FiChevronRight className="ml-1" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {categories.map((category, index) => (
                      <div 
                        key={index}
                        className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer group"
                        onClick={() => {
  setSelectedCategory(category.name);
  navigate('/categories');
}}

                      >
                        <div className="text-3xl mb-4">{category.icon}</div>
                        <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.count} products</p>
                        <div className="mt-4 h-1 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"></div>
                      </div>
                    ))}
                  </div>
                </section>


                
                {/* Featured Products */}
                <section>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
                    <Link to="/products" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                      View All <FiChevronRight className="ml-1" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.slice(0, 4).map(product => (
                      <ProductCard 
                        key={product.id}
                        product={product}
                        addToCart={addToCart}
                        toggleWishlist={toggleWishlist}
                        isInWishlist={wishlist.some(item => item.id === product.id)}
                      />
                    ))}
                  </div>
                </section>

                {/* Features Section */}
                <section className="grid md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                      <FiTruck className="text-3xl text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
                    <p className="text-gray-600">Free delivery on orders over $100</p>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                      <FiShield className="text-3xl text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">2-Year Warranty</h3>
                    <p className="text-gray-600">All products come with warranty</p>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                      <FiCreditCard className="text-3xl text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Secure Payment</h3>
                    <p className="text-gray-600">100% secure payment processing</p>
                  </div>
                </section>
              </div>
            } />

            {/* Products Page */}
            <Route path="/products" element={
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
                    <p className="text-gray-600">Discover our premium collection</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <select 
                      className="px-4 py-2 bg-white border rounded-lg"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <FiFilter className="inline mr-2" />
                      Filter
                    </button>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredProducts.map(product => (
                      <ProductCard 
                        key={product.id}
                        product={product}
                        addToCart={addToCart}
                        toggleWishlist={toggleWishlist}
                        isInWishlist={wishlist.some(item => item.id === product.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            } />

            {/* Cart Page */}
            <Route path="/cart" element={
              <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
                
                {cart.length === 0 ? (
                  <EmptyCart />
                ) : (
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-6">
                      {cart.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                                  <p className="text-gray-600 mt-1">{item.category}</p>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <FiTrash2 className="text-xl" />
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-3 bg-gray-100 rounded-full px-4 py-2">
                                    <button 
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                      <FiMinus />
                                    </button>
                                    <span className="font-semibold text-lg">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                      <FiPlus />
                                    </button>
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500">Price per unit</div>
                                  <div className="text-lg font-semibold">${item.price}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Cart Actions */}
                      <div className="flex justify-between">
                        <Link to="/products" className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-full hover:bg-blue-50">
                          Continue Shopping
                        </Link>
                        <button 
                          onClick={clearCart}
                          className="px-6 py-3 text-red-600 hover:text-red-700"
                        >
                          Clear Cart
                        </button>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                      <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
                        
                        <div className="space-y-4 mb-8">
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal ({cartItemCount} items)</span>
                            <span>${cartTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Shipping</span>
                            <span className="text-green-600">FREE</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Tax</span>
                            <span>${(cartTotal * 0.08).toFixed(2)}</span>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between text-2xl font-bold">
                              <span>Total</span>
                              <span className="text-blue-600">${(cartTotal * 1.08).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={checkout}
                          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-xl transition-shadow"
                        >
                          Proceed to Checkout
                        </button>

                        <div className="mt-6 space-y-4">
                          <div className="text-center text-gray-500">or pay with</div>
                          <div className="flex justify-center space-x-4">
                            <FaPaypal className="text-3xl text-blue-800 cursor-pointer" />
                            <FaCcVisa className="text-3xl text-blue-600 cursor-pointer" />
                            <FaCcMastercard className="text-3xl text-red-600 cursor-pointer" />
                            <FaCcAmex className="text-3xl text-blue-900 cursor-pointer" />
                          </div>
                        </div>

                        <div className="mt-8 space-y-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <FiCheck className="text-green-500 mr-2" />
                            Free returns within 30 days
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FiCheck className="text-green-500 mr-2" />
                            Secure SSL encryption
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FiCheck className="text-green-500 mr-2" />
                            24/7 customer support
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            } />

            {/* Login Page */}
            <Route path="/login" element={
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                  <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
                      <FiLogIn className="text-3xl text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                    <p className="text-gray-600 mt-2">Sign in to your account</p>
                  </div>

                  <form className="space-y-6">
                    <div>
                      <label className="block text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your password"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-gray-700">Remember me</span>
                      </label>
                      <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
                        Forgot password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-shadow"
                    >
                      Sign In
                    </button>

                    <div className="relative text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative bg-white px-4 text-gray-500">or continue with</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex items-center justify-center space-x-2 px-4 py-3 border rounded-xl hover:bg-gray-50">
                        <FaGoogle className="text-red-500" />
                        <span>Google</span>
                      </button>
                      <button className="flex items-center justify-center space-x-2 px-4 py-3 border rounded-xl hover:bg-gray-50">
                        <FaApple />
                        <span>Apple</span>
                      </button>
                    </div>

                    <p className="text-center text-gray-600">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                        Sign up
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            } />

            <Route
  path="/categories"
  element={
    <CategoriesPage
      categories={categories}
      products={products}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      filteredProducts={filteredProducts}
      addToCart={addToCart}
      toggleWishlist={toggleWishlist}
      wishlist={wishlist}
    />
  }
/>



            {/* Register Page */}
            <Route path="/register" element={
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                  <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-4">
                      <FiUserPlus className="text-3xl text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-gray-600 mt-2">Join our tech community</p>
                  </div>

                  <form className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Create a password"
                      />
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-gray-700">
                          I agree to the Terms & Conditions
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-shadow"
                    >
                      Create Account
                    </button>

                    <p className="text-center text-gray-600">
                      Already have an account?{' '}
                      <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                        Sign in
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            } />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="container mx-auto px-4 py-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <Link to="/" className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
                    <FiShoppingBag className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">TechHub</h1>
                    <p className="text-gray-400">Premium Electronics Store</p>
                  </div>
                </Link>
                <p className="text-gray-400 mb-6">
                  Discover the latest tech gadgets and premium electronics with fast delivery and excellent customer service.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600">
                    <FaFacebook />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400">
                    <FaTwitter />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600">
                    <FaInstagram />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700">
                    <FaLinkedin />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-6">Quick Links</h3>
                <ul className="space-y-3">
                  <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                  <li><Link to="/products" className="text-gray-400 hover:text-white">Products</Link></li>
                  <li><Link to="/categories" className="text-gray-400 hover:text-white">Categories</Link></li>
                  <li><Link to="/deals" className="text-gray-400 hover:text-white">Hot Deals</Link></li>
                  <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-6">Support</h3>
                <ul className="space-y-3">
                  <li><Link to="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
                  <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact Us</Link></li>
                  <li><Link to="/shipping" className="text-gray-400 hover:text-white">Shipping Info</Link></li>
                  <li><Link to="/returns" className="text-gray-400 hover:text-white">Returns</Link></li>
                  <li><Link to="/warranty" className="text-gray-400 hover:text-white">Warranty</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-6">Stay Updated</h3>
                <p className="text-gray-400 mb-4">Subscribe to our newsletter</p>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-4 py-3 bg-gray-800 rounded-l-lg focus:outline-none"
                  />
                  <button className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-r-lg">
                    <FiChevronRight className="text-xl" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-12 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400">© 2024 TechHub. All rights reserved.</p>
                <div className="flex space-x-6 mt-4 md:mt-0">
                  <Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
                  <Link to="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link>
                  <Link to="/cookies" className="text-gray-400 hover:text-white">Cookie Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>

        <ToastContainer 
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </Router>
  );
}

// Product Card Component
function ProductCard({ product, addToCart, toggleWishlist, isInWishlist }) {
  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Product Image */}
      <div className="relative overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 space-y-2">
          <button 
            onClick={() => toggleWishlist(product)}
            className={`p-2 rounded-full backdrop-blur-sm ${
              isInWishlist 
                ? 'bg-red-500 text-white' 
                : 'bg-white/80 text-gray-700 hover:bg-red-500 hover:text-white'
            } transition-colors`}
          >
            <FiHeart className={isInWishlist ? 'fill-current' : ''} />
          </button>
          {product.stock < 10 && (
            <div className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
              Only {product.stock} left
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
            {product.category}
          </span>
          <div className="flex items-center">
            <FiStar className="text-yellow-400 fill-current" />
            <span className="ml-1 font-semibold">{product.rating}</span>
            <span className="text-gray-400 text-sm ml-1">({product.reviews})</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">${product.price}</div>
            {product.originalPrice && (
              <div className="text-sm text-gray-500 line-through">${product.originalPrice}</div>
            )}
          </div>
          <button
            onClick={() => addToCart(product)}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow font-medium"
          >
            Add to Cart
          </button>
        </div>

        {/* Features */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {product.features.slice(0, 2).map((feature, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty Cart Component
function EmptyCart() {
  const navigate = useNavigate();
  
  return (
    <div className="text-center py-16">
      <div className="inline-block p-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
        <FiShoppingCart className="text-6xl text-gray-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Looks like you haven't added any products to your cart yet.
      </p>
      <button
        onClick={() => navigate('/products')}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl transition-shadow"
      >
        Browse Products
      </button>
    </div>
  );
}

export default App;