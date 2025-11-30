import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';
import './AdminDashboard.css';
import ProductManagement from './ProductManagement';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, realtimeResponse, ordersResponse] = await Promise.all([
        adminService.getStatistics(),
        adminService.getRealtimeData(),
        adminService.getOrders({ limit: 100 })
      ]);

      if (statsResponse.data.success) {
        setStatistics(statsResponse.data.data);
      }
      
      if (realtimeResponse.data.success) {
        setRealtimeData(realtimeResponse.data.data);
      }
      
      if (ordersResponse.data.success) {
        setAllOrders(ordersResponse.data.data.orders);
      }
      
    } catch (error) {
      console.error('Gabim në marrjen e të dhënave:', error);
      setStatistics(getDemoStatistics());
      setRealtimeData(getDemoRealtimeData());
      setAllOrders(getDemoOrders());
    } finally {
      setLoading(false);
    }
  };

  const getDemoStatistics = () => ({
    overview: {
      totalUsers: 12,
      totalProducts: 6,
      totalOrders: allOrders.length,
      totalRevenue: allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
      lowStockProducts: 2
    },
    monthlyOrders: [
      { month: '2024-01', order_count: 8, revenue: 2450.75 },
      { month: '2024-02', order_count: 12, revenue: 3890.50 }
    ],
    topProducts: [
      { id: 1, name: 'iPhone 15 Pro', total_sold: 5, total_revenue: 5999.95 },
      { id: 2, name: 'MacBook Pro 14"', total_sold: 3, total_revenue: 7499.85 },
      { id: 3, name: 'AirPods Pro', total_sold: 8, total_revenue: 1999.92 }
    ],
    newUsers: [
      { date: '2024-02-01', user_count: 2 },
      { date: '2024-02-02', user_count: 1 }
    ]
  });

  const getDemoRealtimeData = () => ({
    recentOrders: allOrders.slice(0, 5).map(order => ({
      id: order.id,
      username: order.username || 'user',
      total_amount: order.total_amount,
      status: order.status || 'completed',
      created_at: order.created_at
    })),
    userActivity: [
      { username: 'user1', order_count: 3, last_order: new Date() },
      { username: 'user2', order_count: 2, last_order: new Date() }
    ],
    quickStats: {
      todayOrders: allOrders.filter(order => 
        new Date(order.created_at).toDateString() === new Date().toDateString()
      ).length,
      todayRevenue: allOrders
        .filter(order => new Date(order.created_at).toDateString() === new Date().toDateString())
        .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0),
      weeklyRevenue: allOrders
        .filter(order => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(order.created_at) >= weekAgo;
        })
        .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
    }
  });

  const getDemoOrders = () => [
    {
      id: 1001,
      total_amount: '299.99',
      status: 'completed',
      created_at: new Date().toISOString(),
      username: 'user1',
      items: [
        { product_name: 'iPhone 15 Pro', quantity: 1, unit_price: '299.99' }
      ]
    },
    {
      id: 1002,
      total_amount: '1599.99',
      status: 'processing',
      created_at: new Date().toISOString(),
      username: 'user2',
      items: [
        { product_name: 'MacBook Pro 14"', quantity: 1, unit_price: '1599.99' }
      ]
    }
  ];

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await adminService.updateOrderStatus(orderId, newStatus);
      fetchDashboardData();
    } catch (error) {
      console.error('Gabim në përditësimin e statusit:', error);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>🔒 Akses i Kufizuar</h2>
        <p>Ju nuk keni të drejta administrative për të parë këtë faqe.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">🔄 Duke ngarkuar Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🎛️ Dashboard i Adminit</h1>
        <p>Mirë se vini, {user?.username}! Këtu mund të menaxhoni të gjithë sistemin.</p>
        <button 
          onClick={fetchDashboardData}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Statistikat e shpejta */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{statistics.overview.totalUsers}</h3>
              <p>Total Përdorues</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>{statistics.overview.totalProducts}</h3>
              <p>Total Produkte</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-info">
              <h3>{statistics.overview.totalOrders}</h3>
              <p>Total Porosi</p>
            </div>
          </div>
          
          <div className="stat-card revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>{parseFloat(statistics.overview.totalRevenue).toFixed(2)} €</h3>
              <p>Total Të Ardhura</p>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <h3>{statistics.overview.lowStockProducts}</h3>
              <p>Produkte me Stok të Ulet</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}>
          📊 Përmbledhje
        </button>
        <button className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}>
          🛒 Të Gjitha Porositë
        </button>
        <button className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}>
          📦 Produktet
        </button>
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}>
          👥 Përdoruesit
        </button>
      </div>

      {/* Përmbajtja e tabs - KORRIGJUAR */}
      <div className="tab-content">
        {activeTab === 'overview' && <OverviewTab statistics={statistics} realtimeData={realtimeData} />}
        {activeTab === 'orders' && <OrdersTab orders={allOrders} onUpdateStatus={updateOrderStatus} />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
};

// Komponentët e tabs (OverviewTab, OrdersTab, etc. mbeten të njëjtë)
const OverviewTab = ({ statistics, realtimeData }) => (
  <div className="overview-content">
    {realtimeData && (
      <div className="content-section">
        <h3>🕒 Aktiviteti i Fundit (24 Orët)</h3>
        <div className="realtime-stats">
          <div className="realtime-stat">
            <span className="stat-value">{realtimeData.quickStats.todayOrders}</span>
            <span className="stat-label">Porosi Sot</span>
          </div>
          <div className="realtime-stat">
            <span className="stat-value">{parseFloat(realtimeData.quickStats.todayRevenue).toFixed(2)} €</span>
            <span className="stat-label">Të Ardhura Sot</span>
          </div>
          <div className="realtime-stat">
            <span className="stat-value">{parseFloat(realtimeData.quickStats.weeklyRevenue).toFixed(2)} €</span>
            <span className="stat-label">Të Ardhura Javore</span>
          </div>
        </div>

        <div className="recent-orders">
          <h4>Porositë e Fundit</h4>
          {realtimeData.recentOrders.map(order => (
            <div key={order.id} className="order-item">
              <span className="order-id">#{order.id}</span>
              <span className="order-user">{order.username}</span>
              <span className="order-amount">{parseFloat(order.total_amount).toFixed(2)} €</span>
              <span className={`order-status status-${order.status}`}>
                {order.status}
              </span>
              <span className="order-time">
                {new Date(order.created_at).toLocaleTimeString('sq-AL')}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {statistics && (
      <div className="charts-section">
        <div className="chart-container">
          <h4>🏆 Produktet Më të Shitura</h4>
          <div className="top-products">
            {statistics.topProducts.map((product, index) => (
              <div key={product.id} className="product-rank">
                <span className="rank">#{index + 1}</span>
                <span className="product-name">{product.name}</span>
                <span className="sold-count">{product.total_sold} shitje</span>
                <span className="revenue">{parseFloat(product.total_revenue).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

const OrdersTab = ({ orders, onUpdateStatus }) => (
  <div className="orders-content">
    <h3>🛒 Të Gjitha Porositë ({orders.length})</h3>
    
    <div className="orders-list">
      {orders.map(order => (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <div>
              <h4>Porosia #{order.id}</h4>
              <p><strong>Klienti:</strong> {order.username} ({order.full_name})</p>
              <p><strong>Data:</strong> {new Date(order.created_at).toLocaleString('sq-AL')}</p>
              <p><strong>Totali:</strong> {parseFloat(order.total_amount).toFixed(2)} €</p>
            </div>
            <div className="order-actions">
              <span className={`order-status status-${order.status}`}>
                {order.status}
              </span>
              <select 
                value={order.status} 
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className="status-select"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div className="order-items">
            <h5>Artikujt:</h5>
            {order.items && order.items.map(item => (
              <div key={item.id} className="order-item-detail">
                <span>{item.product_name}</span>
                <span>Sasia: {item.quantity}</span>
                <span>{parseFloat(item.unit_price).toFixed(2)} €</span>
                <span>Total: {parseFloat(item.total_price).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProductsTab = ({ statistics }) => (
  <div className="products-content">
    <h3>📦 Menaxhimi i Produkteve</h3>
    <div className="admin-actions">
      <button className="btn btn-primary">➕ Shto Produkt të Ri</button>
      <button className="btn btn-secondary">✏️ Edit Produkte</button>
      <button className="btn btn-warning">📊 Shiko Statistikat</button>
    </div>
    
    {statistics && (
      <div className="products-stats">
        <h4>Statistikat e Produkteve</h4>
        <div className="stats-grid-small">
          <div className="stat-small">
            <span className="stat-number">{statistics.overview.totalProducts}</span>
            <span className="stat-label">Total Produkte</span>
          </div>
          <div className="stat-small">
            <span className="stat-number">{statistics.overview.lowStockProducts}</span>
            <span className="stat-label">Stok i Ulet</span>
          </div>
        </div>
      </div>
    )}
  </div>
);

const UsersTab = () => (
  <div className="users-content">
    <h3>👥 Menaxhimi i Përdoruesve</h3>
    <div className="admin-actions">
      <button className="btn btn-primary">👀 Shiko të Gjithë Përdoruesit</button>
      <button className="btn btn-secondary">🎭 Ndrysho Rolet</button>
      <button className="btn btn-info">📧 Dërgo Email</button>
    </div>
    <p>Menaxhimi i përdoruesve dhe të drejtave të aksesit.</p>
  </div>
);

export default AdminDashboard;