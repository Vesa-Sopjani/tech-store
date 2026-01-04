import React, { useState, useEffect } from 'react';
import { FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiAlertCircle, FiTrendingUp, FiActivity, FiRefreshCw, FiGrid, FiClipboard, FiSettings, FiFileText } from 'react-icons/fi';
import { 
  MdDashboard, 
  MdShoppingCart, 
  MdInventory, 
  MdPeople, 
  MdBarChart, 
  MdSettings,
  MdNotifications,
  MdInsertChart
} from 'react-icons/md';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'react-toastify';
import CategoriesManagement from './CategoriesManagement';
import UsersManagement from './UserManagement';
import ProductManagement from './ProductManagement'; 

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    todayOrders: 0,
    todayRevenue: 0
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [grafanaUrl, setGrafanaUrl] = useState('http://localhost:3000/dashboard');

  // Sample data for demo
  const sampleStats = {
    totalUsers: 1567,
    totalProducts: 342,
    totalOrders: 2894,
    totalRevenue: 128450.75,
    lowStockProducts: 12,
    todayOrders: 24,
    todayRevenue: 12850.00
  };

  const sampleRecentOrders = [
    { id: 'ORD-1001', customer: 'John Doe', amount: 1299.99, status: 'completed', date: new Date() },
    { id: 'ORD-1002', customer: 'Jane Smith', amount: 799.99, status: 'processing', date: subDays(new Date(), 1) },
    { id: 'ORD-1003', customer: 'Bob Johnson', amount: 249.99, status: 'pending', date: subDays(new Date(), 2) },
    { id: 'ORD-1004', customer: 'Alice Brown', amount: 1599.99, status: 'completed', date: subDays(new Date(), 1) },
    { id: 'ORD-1005', customer: 'Charlie Wilson', amount: 349.99, status: 'shipped', date: new Date() },
  ];

  const sampleTopProducts = [
    { name: 'iPhone 15 Pro', sales: 156, revenue: 155844 },
    { name: 'MacBook Pro 16"', sales: 89, revenue: 311611 },
    { name: 'AirPods Pro', sales: 234, revenue: 58566 },
    { name: 'iPad Pro', sales: 123, revenue: 123000 },
    { name: 'Apple Watch', sales: 178, revenue: 71200 },
  ];

  const sampleUserActivity = [
    { username: 'johndoe', orders: 12, lastActive: new Date() },
    { username: 'janesmith', orders: 8, lastActive: subDays(new Date(), 1) },
    { username: 'bobjohnson', orders: 15, lastActive: new Date() },
    { username: 'alicebrown', orders: 6, lastActive: subDays(new Date(), 2) },
    { username: 'charliewilson', orders: 21, lastActive: new Date() },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // In real app, fetch from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats(sampleStats);
      setRecentOrders(sampleRecentOrders);
      setTopProducts(sampleTopProducts);
      setUserActivity(sampleUserActivity);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Chart data
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Revenue ($)',
        data: [45000, 52000, 48000, 61000, 72000, 68000, 75000],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const ordersChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Orders',
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1
      }
    ]
  };

  const categoryChartData = {
    labels: ['Smartphones', 'Laptops', 'Audio', 'Wearables', 'Accessories'],
    datasets: [
      {
        data: [35, 25, 20, 12, 8],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      ${stats.totalRevenue.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiDollarSign className="text-2xl text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+12.5% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Orders</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalOrders.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <FiShoppingCart className="text-2xl text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+8.3% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Customers</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalUsers.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <FiUsers className="text-2xl text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+5.2% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Low Stock Alert</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.lowStockProducts}
                    </h3>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <FiAlertCircle className="text-2xl text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 text-orange-600 text-sm">
                  Products need restocking
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Revenue Trend</h3>
                  <select className="px-3 py-1 border rounded-lg text-sm">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                  </select>
                </div>
                <div className="h-64">
                  <Line data={revenueChartData} options={chartOptions} />
                </div>
              </div>

              {/* Orders Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Daily Orders</h3>
                  <select className="px-3 py-1 border rounded-lg text-sm">
                    <option>This Week</option>
                    <option>Last Week</option>
                    <option>This Month</option>
                  </select>
                </div>
                <div className="h-64">
                  <Bar data={ordersChartData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Orders */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View All →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-4 font-medium">{order.id}</td>
                            <td className="py-4">{order.customer}</td>
                            <td className="py-4 font-bold">${order.amount.toFixed(2)}</td>
                            <td className="py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 text-gray-500 text-sm">
                              {format(order.date, 'MMM dd, HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Top Products</h3>
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.sales} sales</p>
                          </div>
                        </div>
                        <span className="font-bold">${product.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Category Distribution</h3>
                  <div className="h-48">
                    <Pie data={categoryChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      
      case 'categories':
        return <CategoriesManagement />;
      
case 'products':
  return <ProductManagement />; 

case 'orders':
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders Management</h2>
      <p className="text-gray-600 mb-6">Coming soon...</p>
    </div>
  );
      
      case 'users':
  return <UsersManagement />;
      
      case 'audit':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h2>
            <p className="text-gray-600 mb-6">Coming soon...</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
            <p className="text-gray-600 mb-6">Coming soon...</p>
          </div>
        );
      
      default:
        return (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      ${stats.totalRevenue.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiDollarSign className="text-2xl text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+12.5% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Orders</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalOrders.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <FiShoppingCart className="text-2xl text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+8.3% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Customers</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalUsers.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <FiUsers className="text-2xl text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-600 text-sm">
                  <FiTrendingUp className="mr-1" />
                  <span>+5.2% from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Low Stock Alert</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.lowStockProducts}
                    </h3>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <FiAlertCircle className="text-2xl text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 text-orange-600 text-sm">
                  Products need restocking
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <MdDashboard className="mr-3 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and manage your store performance
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button
                onClick={fetchDashboardData}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
              >
                <FiRefreshCw className="mr-2" />
                Refresh Data
              </button>
              <div className="relative">
                <MdNotifications className="text-2xl text-gray-600 cursor-pointer" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </div>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <div className="mt-6 pt-4 border-t">
  <nav className="flex flex-wrap items-center gap-2 md:gap-4">
    <button 
      onClick={() => setActiveTab('dashboard')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <MdDashboard className="mr-2" />
      Dashboard
    </button>
    
    <button 
      onClick={() => setActiveTab('products')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiPackage className="mr-2" />
      Products
    </button>
    
    <button 
      onClick={() => setActiveTab('categories')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'categories' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiGrid className="mr-2" />
      Categories
    </button>
    
    <button 
      onClick={() => setActiveTab('users')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiUsers className="mr-2" />
      Users
    </button>
    
    <button 
      onClick={() => setActiveTab('orders')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiShoppingCart className="mr-2" />
      Orders
    </button>
    
    <button 
      onClick={() => setActiveTab('audit')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiFileText className="mr-2" />
      Audit Logs
    </button>
    
    <button 
      onClick={() => setActiveTab('settings')}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900 border border-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <FiSettings className="mr-2" />
      Settings
    </button>
  </nav>
</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
        
        {/* Vetëm për dashboard, shfaq edhe seksionet e tjera */}
        {activeTab === 'dashboard' && (
          <>
            {/* Grafana Integration Section */}
            <div className="mt-8">
              <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Advanced Analytics</h3>
                    <p className="text-blue-200">Powered by Grafana</p>
                  </div>
                  <MdInsertChart className="text-4xl" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button 
                    onClick={() => window.open(`${grafanaUrl}/sales`, '_blank')}
                    className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors"
                  >
                    <div className="text-xl font-bold mb-2">📈</div>
                    <h4 className="font-semibold mb-1">Sales Dashboard</h4>
                    <p className="text-blue-200 text-sm">Detailed sales analytics</p>
                  </button>
                  
                  <button 
                    onClick={() => window.open(`${grafanaUrl}/users`, '_blank')}
                    className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors"
                  >
                    <div className="text-xl font-bold mb-2">👥</div>
                    <h4 className="font-semibold mb-1">User Analytics</h4>
                    <p className="text-blue-200 text-sm">User behavior & demographics</p>
                  </button>
                  
                  <button 
                    onClick={() => window.open(`${grafanaUrl}/inventory`, '_blank')}
                    className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors"
                  >
                    <div className="text-xl font-bold mb-2">📊</div>
                    <h4 className="font-semibold mb-1">Inventory Stats</h4>
                    <p className="text-blue-200 text-sm">Stock levels & turnover</p>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={grafanaUrl}
                      onChange={(e) => setGrafanaUrl(e.target.value)}
                      placeholder="Enter Grafana URL"
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 w-64"
                    />
                    <button 
                      onClick={() => window.open(grafanaUrl, '_blank')}
                      className="px-6 py-2 bg-white text-blue-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Open Grafana
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Grafana Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <MdShoppingCart className="text-3xl text-blue-600 mb-3" />
                <span className="font-medium">Manage Orders</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <MdInventory className="text-3xl text-purple-600 mb-3" />
                <span className="font-medium">Inventory</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <MdPeople className="text-3xl text-green-600 mb-3" />
                <span className="font-medium">Customers</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <MdSettings className="text-3xl text-orange-600 mb-3" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;