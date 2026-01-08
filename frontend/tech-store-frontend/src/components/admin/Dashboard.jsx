// frontend/src/components/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiDollarSign, FiShoppingCart, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../services/authService';
import { API_URL } from '../../utils/constants';

// Register Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
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
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, ordersRes, productsRes, salesRes, categoriesRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/admin/dashboard/stats`),
        fetchWithAuth(`${API_URL}/api/admin/orders/recent`),
        fetchWithAuth(`${API_URL}/api/admin/products/top`),
        fetchWithAuth(`${API_URL}/api/admin/sales/last-${timeRange}-days`),
        fetchWithAuth(`${API_URL}/api/admin/categories/distribution`)
      ]);

      // Process stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Process recent orders
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData);
      }

      // Process top products
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setTopProducts(productsData);
      }

      // Process sales data
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesData(salesData);
      }

      // Process categories data
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategoriesData(categoriesData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data from API data
  const getRevenueChartData = () => {
    if (salesData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Revenue ($)',
            data: [0],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      };
    }

    const labels = salesData.map(item => 
      format(new Date(item.date), timeRange === '7' ? 'EEE' : 'MMM dd')
    );
    const revenueData = salesData.map(item => item.revenue);

    return {
      labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getOrdersChartData = () => {
    if (salesData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Orders',
            data: [0],
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1
          }
        ]
      };
    }

    const labels = salesData.map(item => 
      format(new Date(item.date), timeRange === '7' ? 'EEE' : 'MMM dd')
    );
    const ordersData = salesData.map(item => item.orders);

    return {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: ordersData,
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const getCategoryChartData = () => {
    if (categoriesData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [100],
            backgroundColor: ['rgba(156, 163, 175, 0.8)']
          }
        ]
      };
    }

    const labels = categoriesData.map(item => item.category);
    const data = categoriesData.map(item => item.total_sales || item.product_count);

    return {
      labels,
      datasets: [
        {
          data,
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
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Revenue')) {
                label += new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(context.parsed.y);
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (value >= 1000) {
              return '$' + (value / 1000).toFixed(0) + 'k';
            }
            return '$' + value;
          }
        }
      }
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch(statusLower) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header - PA navbar brenda */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with your store today.
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={fetchDashboardData}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              <FiRefreshCw className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiDollarSign className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm">
            <span className="text-green-600 font-medium">Today: </span>
            <span>{formatCurrency(stats.todayRevenue)}</span>
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
          <div className="mt-4 text-sm">
            <span className="text-green-600 font-medium">Today: </span>
            <span>{stats.todayOrders} orders</span>
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
          <div className="mt-4 text-sm text-gray-600">
            Active users in system
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
          <div className="mt-4 text-orange-600 text-sm font-medium">
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
            <div className="text-sm text-gray-500">
              Last {timeRange} days
            </div>
          </div>
          <div className="h-64">
            <Line data={getRevenueChartData()} options={chartOptions} />
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Daily Orders</h3>
            <div className="text-sm text-gray-500">
              Last {timeRange} days
            </div>
          </div>
          <div className="h-64">
            <Bar data={getOrdersChartData()} options={chartOptions} />
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
              <div className="text-sm text-gray-500">
                {recentOrders.length} orders
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 font-medium">
                          {order.order_number || `ORD-${order.id}`}
                        </td>
                        <td className="py-4">
                          {order.customer || order.customer_name || order.customer_email || 'N/A'}
                        </td>
                        <td className="py-4 font-bold">
                          {formatCurrency(order.amount || order.total_amount)}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 text-sm">
                          {order.date ? format(new Date(order.date), 'MMM dd, HH:mm') : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  )}
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
              {topProducts.length > 0 ? (
                topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full mr-3 font-medium">
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sales || product.quantity_sold || 0} sales</p>
                      </div>
                    </div>
                    <span className="font-bold whitespace-nowrap">
                      {formatCurrency(product.revenue || product.total_revenue)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No product data available
                </div>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Top Categories</h3>
            <div className="h-48">
              <Pie data={getCategoryChartData()} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;