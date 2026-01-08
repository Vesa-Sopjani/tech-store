import React, { useState, useEffect } from 'react';
import { 
  FiShoppingCart, 
  FiSearch, 
  FiFilter, 
  FiEye, 
  FiDownload, 
  FiTrash2,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiAlertCircle,
  FiPrinter,
  FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';

// API base URL
const API_BASE_URL = 'http://localhost:5002/api';

// API client function
const apiClient = {
  get: async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },
  
  put: async (url, data, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },
  
  delete: async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
};

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    todayOrders: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page]);

  useEffect(() => {
    applyFilters();
  }, [filters, orders]);

  const fetchOrders = async () => {
  try {
    setLoading(true);
    
    const params = new URLSearchParams();
    
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.paymentStatus !== 'all') params.append('paymentStatus', filters.paymentStatus);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.search) params.append('search', filters.search);
    params.append('page', pagination.page);
    params.append('limit', pagination.limit);
    
    const queryString = params.toString();
    const url = `/orders${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    
    console.log('📊 API Response Structure:', response.data); // Debug log
    
    if (response.data && Array.isArray(response.data)) {
      // Normalize data - handle different response structures
      const normalizedOrders = response.data.map(order => {
        console.log('📝 Order structure:', order); // Debug each order
        
        return {
          id: order.id,
          total_amount: order.total_amount,
          status: order.status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          shipping_address: order.shipping_address,
          created_at: order.created_at,
          updated_at: order.updated_at,
          // Handle user data - check different possible structures
          user: {
            id: order.user_id || order.user?.id,
            full_name: order.full_name || order.user?.full_name || `User ${order.user_id}`,
            email: order.email || order.user?.email || '',
            phone: order.phone || order.user?.phone || '',
            username: order.username || order.user?.username || ''
          },
          items: order.items || []
        };
      });
      
      setOrders(normalizedOrders);
      setFilteredOrders(normalizedOrders);
    } else {
      setOrders([]);
      setFilteredOrders([]);
    }
    
    if (response.pagination) {
      setPagination(response.pagination);
    }
    
    // Fetch stats
    await fetchStats();
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    toast.error(`Could not load orders: ${error.message}`);
    
    // Fallback to empty array
    setOrders([]);
    setFilteredOrders([]);
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/orders/stats');
      console.log('Stats Response:', response); // Debug log
      
      if (response.success && response.data?.summary) {
        const summary = response.data.summary;
        
        setStats({
          totalOrders: parseInt(summary.total_orders) || 0,
          pendingOrders: parseInt(summary.pending_orders) || 0,
          completedOrders: parseInt(summary.completed_orders) || 0,
          totalRevenue: parseFloat(summary.total_revenue) || 0,
          todayOrders: parseInt(summary.today_orders) || 0
        });
      } else {
        // Calculate from orders if stats endpoint fails
        calculateStatsFromOrders();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      calculateStatsFromOrders();
    }
  };

  const calculateStatsFromOrders = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => 
      ['completed', 'delivered'].includes(o.status)
    ).length;
    
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
    
    const todayOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const today = new Date().toDateString();
      const orderDate = new Date(o.created_at).toDateString();
      return orderDate === today;
    }).length;

    setStats({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      todayOrders
    });
  };

  const applyFilters = () => {
    let result = [...orders];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(order => 
        (order.id && order.id.toString().toLowerCase().includes(searchTerm)) ||
        (order.user?.full_name && order.user.full_name.toLowerCase().includes(searchTerm)) ||
        (order.user?.email && order.user.email.toLowerCase().includes(searchTerm)) ||
        (order.shipping_address && order.shipping_address.toLowerCase().includes(searchTerm))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(order => order.status === filters.status);
    }

    // Payment status filter
    if (filters.paymentStatus !== 'all') {
      result = result.filter(order => order.payment_status === filters.paymentStatus);
    }

    // Date filter
    if (filters.dateFrom) {
      result = result.filter(order => 
        order.created_at && new Date(order.created_at) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      result = result.filter(order => 
        order.created_at && new Date(order.created_at) <= toDate
      );
    }

    // Amount filter
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      result = result.filter(order => {
        const amount = parseFloat(order.total_amount) || 0;
        return amount >= minAmount;
      });
    }
    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      result = result.filter(order => {
        const amount = parseFloat(order.total_amount) || 0;
        return amount <= maxAmount;
      });
    }

    setFilteredOrders(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Reset to page 1 when filters change
    if (key !== 'page') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      
      if (response.success) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        ));
        
        toast.success(`Order status updated to ${newStatus}`);
        
        // Refresh stats
        await fetchStats();
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
    }
  };

  const handlePaymentStatusChange = async (orderId, paymentStatus) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/payment`, { payment_status: paymentStatus });
      
      if (response.success) {
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, payment_status: paymentStatus, updated_at: new Date().toISOString() }
            : order
        ));
        
        toast.success(`Payment status updated to ${paymentStatus}`);
      }
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(`Failed to update payment status: ${error.message}`);
    }
  };

  const handleViewDetails = async (order) => {
    try {
      // Fetch full order details
      const response = await apiClient.get(`/orders/${order.id}`);
      
      if (response.success) {
        setSelectedOrder(response.data);
        setShowOrderDetails(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(`Failed to load order details: ${error.message}`);
      
      // Fallback to basic order info
      setSelectedOrder(order);
      setShowOrderDetails(true);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await apiClient.delete(`/orders/${orderId}`);
      
      if (response.success) {
        // Remove from local state
        setOrders(prev => prev.filter(order => order.id !== orderId));
        setFilteredOrders(prev => prev.filter(order => order.id !== orderId));
        
        toast.success('Order deleted successfully');
        
        // Refresh stats
        await fetchStats();
        
        // Close modal if open
        if (selectedOrder && selectedOrder.id === orderId) {
          setShowOrderDetails(false);
          setSelectedOrder(null);
        }
      }
      
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(`Failed to delete order: ${error.message}`);
    }
  };

  const handleExportOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/export`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `orders_${Date.now()}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Orders exported successfully');
      
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error(`Failed to export orders: ${error.message}`);
      
      // Fallback: Create client-side CSV
      createClientSideExport();
    }
  };

  const createClientSideExport = () => {
    const exportData = filteredOrders.map(order => ({
      'Order ID': order.id || 'N/A',
      'Customer': order.user?.full_name || order.user?.username || 'N/A',
      'Email': order.user?.email || 'N/A',
      'Amount': `$${(parseFloat(order.total_amount) || 0).toFixed(2)}`,
      'Status': order.status || 'N/A',
      'Payment Status': order.payment_status || 'N/A',
      'Payment Method': order.payment_method || 'N/A',
      'Date': order.created_at ? format(new Date(order.created_at), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Shipping Address': order.shipping_address || 'N/A'
    }));
    
    if (exportData.length === 0) {
      toast.info('No orders to export');
      return;
    }
    
    const csvHeader = Object.keys(exportData[0]).join(',');
    const csvRows = exportData.map(row => 
      Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    );
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.info('Orders exported (client-side fallback)');
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock className="mr-1" /> },
      processing: { color: 'bg-blue-100 text-blue-800', icon: <FiAlertCircle className="mr-1" /> },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: <FiTruck className="mr-1" /> },
      delivered: { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle className="mr-1" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle className="mr-1" /> },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <FiXCircle className="mr-1" /> }
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusConfig[status]?.color || 'bg-gray-100 text-gray-800'}`}>
        {statusConfig[status]?.icon}
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    if (!status) return null;
    
    const config = {
      paid: { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle className="mr-1" /> },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock className="mr-1" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <FiXCircle className="mr-1" /> },
      refunded: { color: 'bg-blue-100 text-blue-800', icon: <FiDollarSign className="mr-1" /> }
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${config[status]?.color || 'bg-gray-100 text-gray-800'}`}>
        {config[status]?.icon}
        {status}
      </span>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Order Details: {selectedOrder.id || 'N/A'}</h3>
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiXCircle className="text-2xl" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-4">Order Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{selectedOrder.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">
                      {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'PPpp') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    {getPaymentStatusBadge(selectedOrder.payment_status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">{selectedOrder.payment_method || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-lg">
                      ${(parseFloat(selectedOrder.total_amount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-4">Customer Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedOrder.user?.full_name || selectedOrder.user?.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedOrder.user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedOrder.user?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Shipping Address:</span>
                    <span className="font-medium">{selectedOrder.shipping_address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="font-bold text-lg mb-4">Order Items</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">Quantity</th>
                      <th className="text-left p-3">Unit Price</th>
                      <th className="text-left p-3">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">{item.product_name || item.name || 'Product'}</td>
                          <td className="p-3">{item.quantity || 0}</td>
                          <td className="p-3">${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                          <td className="p-3 font-bold">${(parseFloat(item.total_price) || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan="3" className="p-3 text-right">Total:</td>
                      <td className="p-3">${(parseFloat(selectedOrder.total_amount) || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-end">
              <button
                onClick={() => handleExportOrders()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPrinter className="mr-2" />
                Print Invoice
              </button>
              
              <div className="flex gap-2">
                <select
                  value={selectedOrder.status || ''}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select
                  value={selectedOrder.payment_status || ''}
                  onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <FiTrash2 className="mr-2" />
                Delete Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
            <FiShoppingCart className="mr-3 text-blue-600" />
            Orders Management
          </h2>
          <p className="text-gray-600">
            Manage and monitor all customer orders
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center px-4 py-2 mt-4 md:mt-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
        >
          <FiRefreshCw className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalOrders.toLocaleString()}
              </h3>
            </div>
            <FiShoppingCart className="text-2xl text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.completedOrders.toLocaleString()}
              </h3>
            </div>
            <FiCheckCircle className="text-2xl text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.pendingOrders.toLocaleString()}
              </h3>
            </div>
            <FiClock className="text-2xl text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.todayOrders.toLocaleString()}
              </h3>
            </div>
            <FiAlertCircle className="text-2xl text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ${stats.totalRevenue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </h3>
            </div>
            <FiDollarSign className="text-2xl text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <FiFilter className="mr-2" />
            Filters & Search
          </h3>
          <div className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 pr-4 py-2 border rounded-lg w-full"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExportOrders}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full justify-center"
            >
              <FiDownload className="mr-2" />
              Export Orders
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount ($)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount ($)</label>
            <input
              type="number"
              placeholder="9999"
              min="0"
              step="0.01"
              className="px-4 py-2 border rounded-lg w-full"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              setFilters({
                search: '',
                status: 'all',
                paymentStatus: 'all',
                dateFrom: '',
                dateTo: '',
                minAmount: '',
                maxAmount: ''
              });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700">Order ID</th>
                <th className="text-left p-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="text-left p-4 font-semibold text-gray-700">Payment</th>
                <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
<tbody>
  {filteredOrders.length > 0 ? (
    filteredOrders.map((order) => (
      <tr key={order.id} className="border-b hover:bg-gray-50">
        <td className="p-4 font-medium">#{order.id || 'N/A'}</td>
        <td className="p-4">
          <div>
            <div className="font-medium">
              {/* Shfaq full_name nëse ka, përndryshe username, përndryshe user_id */}
              {order.user?.full_name || order.user?.username || `User ${order.user?.id || order.user_id || 'N/A'}`}
            </div>
            <div className="text-sm text-gray-500">
              {order.user?.email || 'No email'}
            </div>
            {order.user?.phone && (
              <div className="text-xs text-gray-400">
                {order.user.phone}
              </div>
            )}
          </div>
        </td>
        <td className="p-4 text-gray-600">
          {order.created_at ? (
            <>
              {format(new Date(order.created_at), 'MMM dd, yyyy')}
              <div className="text-sm text-gray-400">
                {format(new Date(order.created_at), 'HH:mm')}
              </div>
            </>
          ) : (
            'N/A'
          )}
        </td>
        <td className="p-4 font-bold">
          ${(parseFloat(order.total_amount) || 0).toFixed(2)}
        </td>
        <td className="p-4">{getStatusBadge(order.status)}</td>
        <td className="p-4">
          <div className="space-y-1">
            {getPaymentStatusBadge(order.payment_status)}
            <div className="text-xs text-gray-500">
              {order.payment_method || 'N/A'}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => handleViewDetails(order)}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
              title="View Details"
            >
              <FiEye />
            </button>
            <select
              value={order.status || ''}
              onChange={(e) => handleStatusChange(order.id, e.target.value)}
              className="p-2 border rounded-lg text-sm"
              title="Change Status"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => handleDeleteOrder(order.id)}
              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              title="Delete Order"
            >
              <FiTrash2 />
            </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" className="p-8 text-center">
        <FiShoppingCart className="text-4xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-600">Try adjusting your filters or search terms</p>
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-4 sm:mb-0">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`px-4 py-2 border rounded-lg ${
                pagination.page <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 border rounded-lg ${
                    pagination.page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className={`px-4 py-2 border rounded-lg ${
                pagination.page >= pagination.pages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && <OrderDetailsModal />}
    </div>
  );
};

export default OrdersManagement;