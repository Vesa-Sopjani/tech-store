import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiShoppingCart, 
  FiUser, 
  FiLogOut, 
  FiPackage, 
  FiBarChart2, 
  FiSettings,
  FiHome,
  FiGrid,
  FiLogIn,
  FiUserPlus,
  FiShoppingBag,
  FiChevronDown,
  FiSearch, // ✅ Shto
  FiHeart // ✅ Shto për wishlist
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ cartItemCount = 0, wishlistCount = 0 }) => { // ✅ Shto wishlistCount prop
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // ✅ Shto state për search
  
  // Nxjerr isAdmin nga role i user-it
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  
  // Handle scroll for header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.user-menu')) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  // Close dropdown when route changes
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  // Show loading state
  if (loading && !user) {
    return (
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl"></div>
              <div className="space-y-2">
                <div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div>
                <div className="w-24 h-3 bg-gray-100 animate-pulse rounded"></div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full"></div>
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200' 
        : 'bg-white/90 backdrop-blur-sm border-b border-gray-100'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur transition duration-300 ${
                isScrolled ? 'opacity-30' : 'opacity-20 group-hover:opacity-40'
              }`}></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2.5 rounded-xl">
                <FiShoppingBag className="text-white text-xl" />
              </div>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TechStore
              </h1>
              <p className="text-xs text-gray-500 hidden md:block">Premium Electronics</p>
            </div>
          </Link>

          {/* ✅ Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <form onSubmit={handleSearch} className="relative w-full">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              />
            </form>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`font-medium transition-colors flex items-center ${
                location.pathname === '/' 
                  ? 'text-purple-600' 
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <FiHome className="mr-2" />
              Home
            </Link>
            <Link 
              to="/products" 
              className={`font-medium transition-colors flex items-center ${
                location.pathname === '/products' 
                  ? 'text-purple-600' 
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <FiGrid className="mr-2" />
              Products
            </Link>

            <Link 
              to="/categories" 
              className={`font-medium transition-colors flex items-center ${
                location.pathname === '/categories' 
                  ? 'text-purple-600' 
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <FiGrid className="mr-2" />
              Categories
            </Link>
            
            {/* ✅ Wishlist link */}
            <Link 
              to="/wishlist" 
              className={`font-medium transition-colors flex items-center relative ${
                location.pathname === '/wishlist' 
                  ? 'text-purple-600' 
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <FiHeart className="mr-2" />
              
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>
            
            {/* Admin link - SHTO VETËM NËSE ËSHTË ADMIN */}
            {isAuthenticated && isAdmin && (
              <Link 
                to="/admin/dashboard" 
                className={`font-medium transition-colors flex items-center ${
                  location.pathname.includes('/admin') 
                    ? 'text-purple-600' 
                    : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                <FiSettings className="mr-2" />
                Admin
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Cart - SHTO GJITHMONË */}
            <Link 
              to="/cart" 
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <FiShoppingCart className="text-xl text-gray-700 group-hover:text-purple-600" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* ✅ Mobile Search Button */}
            <button
              onClick={() => navigate('/products')}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiSearch className="text-xl text-gray-700" />
            </button>

            {/* User Menu - SHTO VETËM NËSE PËRDORUESI ËSHTË I LOGUAR */}
            {isAuthenticated ? (
              <div className="relative user-menu">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-full md:rounded-lg transition-colors group"
                >
                  <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                    {user?.username?.charAt(0)?.toUpperCase() || 
                     user?.email?.charAt(0)?.toUpperCase() || 
                     'U'}
                  </div>
                  <div className="hidden md:flex items-center">
                    <div className="text-left mr-2">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {user?.username || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isAdmin ? 'Administrator' : 'Customer'}
                      </p>
                    </div>
                    <FiChevronDown className={`text-gray-400 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </div>
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 border z-50 animate-fadeIn">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b">
                      <p className="font-medium text-gray-900 truncate">{user?.username || 'User'}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                        isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isAdmin ? 'Administrator' : 'Customer'}
                      </span>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link 
                        to="/profile" 
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 text-gray-700 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FiUser className="text-gray-400" />
                        <span>Profili Im</span>
                      </Link>
                      
                      <Link 
                        to="/orders" 
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 text-gray-700 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FiPackage className="text-gray-400" />
                        <span>Porositë e Mia</span>
                      </Link>

                      {/* Wishlist in dropdown */}
                      <Link 
                        to="/wishlist" 
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 text-gray-700 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <FiHeart className="text-gray-400" />
                        <span>Wishlist</span>
                        {wishlistCount > 0 && (
                          <span className="ml-auto bg-red-100 text-red-800 text-xs rounded-full px-2 py-1">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                      
                      {/* Admin Links - vetëm për admin */}
                      {isAdmin && (
                        <>
                          <Link 
                            to="/admin/dashboard" 
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 text-gray-700 transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <FiSettings className="text-gray-400" />
                            <span>Admin Dashboard</span>
                          </Link>
                          
                          <Link 
                            to="/admin/analytics" 
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 text-gray-700 transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <FiBarChart2 className="text-gray-400" />
                            <span>Analitikë</span>
                          </Link>
                        </>
                      )}
                    </div>
                    
                    {/* Logout */}
                    <div className="border-t pt-2">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-red-50 w-full text-left text-red-600 transition-colors rounded-b-xl"
                      >
                        <FiLogOut />
                        <span>Çkyçu</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LOGIN & SIGN UP - SHTO VETËM NËSE NUK KA PËRDORUES */
              <div className="flex items-center space-x-3">
                <Link 
                  to="/login" 
                  className="flex items-center space-x-2 px-4 py-2 text-purple-600 hover:text-purple-700 font-medium border border-purple-200 rounded-full hover:bg-purple-50 transition-colors text-sm md:text-base"
                >
                  <FiLogIn className="text-lg" />
                  <span className="hidden sm:inline">Kyçu</span>
                </Link>
                <Link 
                  to="/register" 
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow text-sm md:text-base"
                >
                  <FiUserPlus className="text-lg" />
                  <span className="hidden sm:inline">Regjistrohu</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </form>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-center space-x-4 mt-3 pt-3 border-t">
          <Link 
            to="/" 
            className={`text-sm font-medium flex items-center ${
              location.pathname === '/' 
                ? 'text-purple-600' 
                : 'text-gray-700'
            }`}
          >
            <FiHome className="mr-1" />
            Home
          </Link>
          <Link 
            to="/products" 
            className={`text-sm font-medium flex items-center ${
              location.pathname === '/products' 
                ? 'text-purple-600' 
                : 'text-gray-700'
            }`}
          >
            <FiGrid className="mr-1" />
            Products
          </Link>
          <Link 
            to="/wishlist" 
            className={`text-sm font-medium flex items-center relative ${
              location.pathname === '/wishlist' 
                ? 'text-purple-600' 
                : 'text-gray-700'
            }`}
          >
            <FiHeart className="mr-1" />
            Wishlist
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>
          {isAuthenticated && isAdmin && (
            <Link 
              to="/admin/dashboard" 
              className={`text-sm font-medium flex items-center ${
                location.pathname.includes('/admin') 
                  ? 'text-purple-600' 
                  : 'text-gray-700'
              }`}
            >
              <FiSettings className="mr-1" />
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

// Add CSS animation for dropdown
const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default Header;