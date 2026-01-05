// backend/services/order-service/src/index.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Përdor mysql2 me promise

const app = express();
const PORT = process.env.PORT || 5002;

// Database connection pool
console.log('📡 Connecting to database with mysql2...');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ============= ROUTES =============

// Health check
app.get('/health', async (req, res) => {
  try {
    console.log('🩺 Health check requested');
    const [rows] = await dbPool.query('SELECT 1 as test');
    res.json({ 
      status: 'healthy', 
      service: 'order-service',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message
    });
  }
});

// Get all orders - SIMPLIFIED
app.get('/api/orders', async (req, res) => {
  try {
    console.log('📦 Fetching orders...');
    
    // Simplified query for testing
    const [orders] = await dbPool.query(`
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.payment_method,
        o.payment_status,
        o.shipping_address,
        o.created_at,
        u.full_name,
        u.email,
        u.phone
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 20
    `);
    
    console.log(`✅ Found ${orders.length} orders`);
    
    // Get items for each order
    for (let order of orders) {
      try {
        const [items] = await dbPool.query(
          `SELECT oi.*, p.name as product_name 
           FROM OrderItems oi 
           JOIN Products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );
        order.items = items;
      } catch (itemError) {
        console.error(`❌ Error fetching items for order ${order.id}:`, itemError);
        order.items = [];
      }
    }
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: 1,
        limit: 20,
        total: orders.length,
        pages: 1
      }
    });
    
  } catch (error) {
    console.error('💥 Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order statistics
app.get('/api/orders/stats', async (req, res) => {
  try {
    const [stats] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue
      FROM Orders
    `);
    
    res.json({
      success: true,
      data: {
        summary: stats[0] || {}
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    await dbPool.query(
      'UPDATE Orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );
    
    res.json({
      success: true,
      message: `Order status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    await dbPool.query('DELETE FROM OrderItems WHERE order_id = ?', [orderId]);
    await dbPool.query('DELETE FROM Orders WHERE id = ?', [orderId]);
    
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Order Service running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'TechProductDB'}`);
  console.log(`🌍 CORS enabled for: http://localhost:5173`);
});