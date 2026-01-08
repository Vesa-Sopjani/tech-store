// frontend/src/components/admin/AdminLayout.jsx
import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiPackage, FiShoppingCart, FiSettings, 
  FiGrid, FiHome, FiLogOut, FiBell, FiHelpCircle
} from 'react-icons/fi';
import { MdDashboard } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: <MdDashboard className="mr-2" />,
      color: 'blue'
    },
    { 
      path: '/admin/Products', 
      label: 'Products', 
      icon: <FiPackage className="mr-2" />,
      color: 'purple'
    },
    { 
      path: '/admin/CategoriesManagement', 
      label: 'Categories', 
      icon: <FiGrid className="mr-2" />,
      color: 'indigo'
    },
    { 
      path: '/admin/Users', 
      label: 'Users', 
      icon: <FiUsers className="mr-2" />,
      color: 'red'
    },
    { 
      path: '/admin/Orders', 
      label: 'Orders', 
      icon: <FiShoppingCart className="mr-2" />,
      color: 'green'
    },
    { 
      path: '/admin/settings', 
      label: 'Settings', 
      icon: <FiSettings className="mr-2" />,
      color: 'gray'
    },
  ];

  const getButtonClass = (itemPath) => {
    const isActive = location.pathname === itemPath || 
                    (itemPath === '/admin/dashboard' && location.pathname === '/admin');
    
    // Gjej item-in bazuar në path
    const item = navItems.find(navItem => navItem.path === itemPath);
    const color = item?.color || 'gray'; // Default color nëse nuk gjendet
    
    const colorClasses = {
      blue: isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-100',
      purple: isActive ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-700 hover:bg-gray-100',
      indigo: isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-700 hover:bg-gray-100',
      red: isActive ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-700 hover:bg-gray-100',
      green: isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-700 hover:bg-gray-100',
      gray: isActive ? 'bg-gray-100 text-gray-900 border border-gray-300' : 'text-gray-700 hover:bg-gray-100'
    };

    return `flex items-center px-3 py-2 rounded-lg transition-colors ${colorClasses[color]}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center justify-between md:justify-start">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
                  <MdDashboard className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">
                    {user?.email || user?.username || 'Administrator'}
                  </p>
                </div>
              </div>
              
              {/* Mobile menu button would go here */}
            </div>

            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <FiBell className="text-lg" />
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <FiHelpCircle className="text-lg" />
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiHome className="mr-2" />
                Home
              </button>
              
              <button 
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <FiLogOut className="mr-2" />
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <div className="mt-4 pt-4 border-t">
            <nav className="flex flex-wrap items-center gap-2 md:gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={getButtonClass(item.path)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;