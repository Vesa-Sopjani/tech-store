import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTruck, 
  FiXCircle,
  FiEye,
  FiShoppingBag,
  FiRefreshCw,
  FiMapPin,
  FiDollarSign,
  FiCalendar,
  FiAlertCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5002/api';

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response = await fetch(`${API_BASE_URL}/my-orders`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.log('Token cookie failed, trying localStorage token...');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Session expired. Please login again.');
        }
        
        response = await fetch(`${API_BASE_URL}/my-orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        
        let errorMessage = 'Failed to fetch orders';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Server returned unsuccessful response');
      }
      
      setOrders(data.data || []);
      toast.success('Orders loaded successfully');
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
      toast.error(error.message || 'Could not load your orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      let response = await fetch(`${API_BASE_URL}/my-orders/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Session expired');
        }
        
        response = await fetch(`${API_BASE_URL}/my-orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch order details (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load order details');
      }
      
      setSelectedOrder(data.data);
      setShowDetails(true);
      
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(error.message || 'Could not load order details');
    }
  };

const cancelOrder = async (orderId) => {
  try {
    let response = await fetch(
      `${API_BASE_URL}/my-orders/${orderId}/cancel`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 401) {
      const token = localStorage.getItem('token');
      response = await fetch(
        `${API_BASE_URL}/my-orders/${orderId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    toast.success('Order cancelled successfully');
    fetchMyOrders(); 

  } catch (error) {
    toast.error(error.message || 'Failed to cancel order');
  }
};

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      toast.error('Please login to view your orders');
      navigate('/login');
      return;
    }
    
    fetchMyOrders();
  }, []);

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending') return orders.filter(order => order.status === 'pending');
    if (activeTab === 'completed') return orders.filter(order => 
      ['completed', 'delivered'].includes(order.status)
    );
    if (activeTab === 'cancelled') return orders.filter(order => order.status === 'cancelled');
    return orders;
  };

  const StatusBadge = ({ status }) => {
    const getStatusConfig = () => {
      switch(status?.toLowerCase()) {
        case 'pending':
          return {
            color: 'bg-yellow-100 text-yellow-800',
            icon: <FiClock className="mr-1" />,
            text: 'Pending'
          };
        case 'processing':
          return {
            color: 'bg-blue-100 text-blue-800',
            icon: <FiPackage className="mr-1" />,
            text: 'Processing'
          };
        case 'shipped':
          return {
            color: 'bg-purple-100 text-purple-800',
            icon: <FiTruck className="mr-1" />,
            text: 'Shipped'
          };
        case 'delivered':
        case 'completed':
          return {
            color: 'bg-green-100 text-green-800',
            icon: <FiCheckCircle className="mr-1" />,
            text: status === 'delivered' ? 'Delivered' : 'Completed'
          };
        case 'cancelled':
          return {
            color: 'bg-red-100 text-red-800',
            icon: <FiXCircle className="mr-1" />,
            text: 'Cancelled'
          };
        default:
          return {
            color: 'bg-gray-100 text-gray-800',
            icon: <FiPackage className="mr-1" />,
            text: status || 'Unknown'
          };
      }
    };

    const config = getStatusConfig();
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };
const canCancelOrder = (order) => {
  if (order.status !== 'pending') return false;
  if (!order.created_at) return false;

  const orderDate = new Date(order.created_at);
  const now = new Date();
  const diffInDays = (now - orderDate) / (1000 * 60 * 60 * 24);

  return diffInDays <= 3;
};

  const PaymentStatusBadge = ({ status }) => {
    const getPaymentConfig = () => {
      switch(status?.toLowerCase()) {
        case 'paid':
          return {
            color: 'bg-green-100 text-green-800',
            icon: <FiCheckCircle className="mr-1" />,
            text: 'Paid'
          };
        case 'pending':
          return {
            color: 'bg-yellow-100 text-yellow-800',
            icon: <FiClock className="mr-1" />,
            text: 'Pending'
          };
        case 'failed':
          return {
            color: 'bg-red-100 text-red-800',
            icon: <FiXCircle className="mr-1" />,
            text: 'Failed'
          };
        case 'refunded':
          return {
            color: 'bg-blue-100 text-blue-800',
            icon: <FiDollarSign className="mr-1" />,
            text: 'Refunded'
          };
        default:
          return {
            color: 'bg-gray-100 text-gray-800',
            icon: <FiClock className="mr-1" />,
            text: status || 'Unknown'
          };
      }
    };

    const config = getPaymentConfig();
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    const calculateOrderTotal = () => {
      if (selectedOrder.items && selectedOrder.items.length > 0) {
        return selectedOrder.items.reduce((sum, item) => {
          return sum + (parseFloat(item.total_price) || 0);
        }, 0);
      }
      return parseFloat(selectedOrder.total_amount) || 0;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
                <p className="text-gray-600">
                  Order #{selectedOrder.order_number || selectedOrder.id}
                </p>
              </div>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Order Information */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <FiPackage className="mr-2" />
                  Order Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">
                      {selectedOrder.created_at ? 
                        format(new Date(selectedOrder.created_at), 'PPpp') : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <div className="text-right">
                      <PaymentStatusBadge status={selectedOrder.payment_status} />
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedOrder.payment_method || 'Cash on Delivery'}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">
                      {selectedOrder.item_count || (selectedOrder.items ? selectedOrder.items.length : 0)} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <FiMapPin className="mr-2" />
                  Shipping Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 block mb-1">Address:</span>
                    <span className="font-medium">
                      {selectedOrder.shipping_address || 'No address provided'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-8">
              <h4 className="font-bold text-lg mb-4">Order Items</h4>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Quantity</th>
                        <th className="text-left p-3">Unit Price</th>
                        <th className="text-left p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center">
                              {item.product_image ? (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name}
                                  className="w-12 h-12 object-cover rounded-md mr-3"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <div style={{ display: item.product_image ? 'none' : 'block' }} className="w-12 h-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">IMG</span>
                              </div>
                              <div>
                                <div className="font-medium">{item.product_name || 'Product'}</div>
                                {item.product_category && (
                                  <div className="text-xs text-gray-500">{item.product_category}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                          <td className="p-3 font-bold">${(parseFloat(item.total_price) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan="3" className="p-3 text-right">Total:</td>
                        <td className="p-3 text-lg">
                          ${calculateOrderTotal().toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiPackage className="text-3xl mx-auto mb-2" />
                  No items found in this order
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  toast.info('Invoice print feature coming soon');
                }}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Print Invoice
              </button>
              
              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => {
                    toast.info('Review feature coming soon');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Leave Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
            <div className="relative p-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-full">
              <FiAlertCircle className="text-5xl text-red-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Orders</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchMyOrders}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiRefreshCw className="inline mr-2" />
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <FiShoppingBag className="mr-3 text-blue-600" />
          My Orders
        </h1>
        <p className="text-gray-600">
          View and track all your orders in one place
        </p>
      </div>

      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Orders</p>
                <h3 className="text-2xl font-bold mt-2">{orders.length}</h3>
              </div>
              <FiShoppingBag className="text-2xl text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Completed</p>
                <h3 className="text-2xl font-bold mt-2">
                  {orders.filter(o => ['completed', 'delivered'].includes(o.status)).length}
                </h3>
              </div>
              <FiCheckCircle className="text-2xl text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Pending</p>
                <h3 className="text-2xl font-bold mt-2">
                  {orders.filter(o => o.status === 'pending').length}
                </h3>
              </div>
              <FiClock className="text-2xl text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Total Spent</p>
                <h3 className="text-2xl font-bold mt-2">
                  ${orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0).toFixed(2)}
                </h3>
              </div>
              <FiDollarSign className="text-2xl text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Vetem nese ka porosi */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="border-b">
            <nav className="flex flex-wrap">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-4 font-medium ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 font-medium ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Pending ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-6 py-4 font-medium ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Completed ({orders.filter(o => ['completed', 'delivered'].includes(o.status)).length})
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`px-6 py-4 font-medium ${activeTab === 'cancelled' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Cancelled ({orders.filter(o => o.status === 'cancelled').length})
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-6">
        {getFilteredOrders().length > 0 ? (
          getFilteredOrders().map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <h3 className="text-xl font-bold text-gray-900 mr-3">
                        Order #{order.order_number || order.id}
                      </h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-gray-600 flex items-center">
                      <FiCalendar className="mr-2" />
                      {order.created_at ? format(new Date(order.created_at), 'PP') : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${(parseFloat(order.total_amount) || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.item_count || 0} items
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                {order.items && order.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex items-center py-3 border-t">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg mr-3 overflow-hidden flex items-center justify-center">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <div className="text-gray-400 text-xs" style={{ display: item.product_image ? 'none' : 'block' }}>
                        IMG
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name || 'Product'}</div>
                      <div className="text-sm text-gray-500">
                        Qty: {item.quantity} × ${(parseFloat(item.unit_price) || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="font-bold">
                      ${(parseFloat(item.total_price) || 0).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t">
                  <div>
                    <PaymentStatusBadge status={order.payment_status} />
                    {order.payment_method && (
                      <div className="text-sm text-gray-500 mt-1">
                        {order.payment_method}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-x-3">
                    <button
                      onClick={() => fetchOrderDetails(order.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <FiEye className="mr-2" />
                      View Details
                    </button>
                    
                        {canCancelOrder(order) && (
                            <button
                                onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this order?')) {
                                    cancelOrder(order.id);
                                }
                                }}
                                className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                            >
                                Cancel Order
                            </button>
                            )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
              <div className="relative p-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
                <FiShoppingBag className="text-5xl text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {orders.length === 0 ? "No orders found" : `No ${activeTab} orders`}
            </h3>
            <p className="text-gray-600 mb-8">
              {orders.length === 0 
                ? "You haven't placed any orders yet. Start shopping to see your orders here."
                : `You don't have any ${activeTab} orders.`}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl hover:shadow-purple-500/25 transition-all"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>

      {/* Refresh Button - Vetem nese ka porosi */}
      {orders.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={fetchMyOrders}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:shadow-lg transition-shadow mx-auto"
          >
            <FiRefreshCw className="mr-2" />
            Refresh Orders
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && <OrderDetailsModal />}
    </div>
  );
};

export default MyOrders;