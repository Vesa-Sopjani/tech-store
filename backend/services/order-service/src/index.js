// backend/services/order-service/src/index.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise'); 
const app = express();
const PORT = process.env.PORT || 5002;

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
app.use(cookieParser());
const authenticateToken = (req, res, next) => {
  console.log('🔐 [Order Service] Checking authentication...');
  
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('📦 Token taken from Authorization header');
    }
  }
  if (!token) {
    console.log('❌ No access token found in cookies or headers');
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login again.',
      code: 'TOKEN_MISSING',
      suggestion: 'Check if cookies are enabled and you are logged in'
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    
    console.log('Using JWT_SECRET:', JWT_SECRET ? 'Present' : 'Missing');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log(`✅ Token valid for user: ${decoded.username || decoded.email} (ID: ${decoded.id})`);
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'customer'
    };
    
    next(); 
    
  } catch (error) {
    console.log('❌ Token verification failed:', error.name);
    console.log('Error details:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh.',
        code: 'TOKEN_EXPIRED',
        expired: true
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or corrupted access token',
        code: 'TOKEN_INVALID',
        details: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR',
      details: error.message
    });
  }
};


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});


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
app.post('/api/orders', authenticateToken, async (req, res) => {
  let connection;
  
  try {
    console.log('📦 Creating new order...');
    connection = await dbPool.getConnection();
    await connection.beginTransaction();
    
    const { user_id, items, shipping_address, payment_method } = req.body;
    
    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data'
      });
    }

    let total_amount = 0;
    for (const item of items) {
      const [productRows] = await connection.execute(
        'SELECT price, stock_quantity, name FROM Products WHERE id = ?',
        [item.product_id]
      );
      
      if (productRows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
      
      const product = productRows[0];
      
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`);
      }
      
      const itemTotal = product.price * item.quantity;
      total_amount += itemTotal;
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO Orders (user_id, total_amount, shipping_address, payment_method, status, payment_status)
       VALUES (?, ?, ?, ?, 'pending', 'pending')`,
      [user_id, total_amount, shipping_address, payment_method]
    );
    
    const orderId = orderResult.insertId;
    
    const orderNumber = `ORD-${orderId.toString().padStart(6, '0')}`;
    await connection.execute(
      'UPDATE Orders SET order_number = ? WHERE id = ?',
      [orderNumber, orderId]
    );

    for (const item of items) {
      const [productRows] = await connection.execute(
        'SELECT price FROM Products WHERE id = ?',
        [item.product_id]
      );
      
      const product = productRows[0];
      const itemTotal = product.price * item.quantity;
      
      await connection.execute(
        `INSERT INTO OrderItems (order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, product.price, itemTotal]
      );
      await connection.execute(
        'UPDATE Products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();

    const [orderRows] = await connection.execute(
      `SELECT o.*, u.full_name, u.email
       FROM Orders o
       LEFT JOIN Users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );
    
    const order = orderRows[0];
    
    const [itemsRows] = await connection.execute(
      `SELECT oi.*, p.name as product_name
       FROM OrderItems oi
       LEFT JOIN Products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    order.items = itemsRows;
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
    
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Order creation error:', err);
    
    res.status(500).json({
      success: false,
      message: err.message || 'Server error creating order'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
app.get('/api/orders', async (req, res) => {
  try {
    console.log('📦 Fetching orders...');
    
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
    
    for (let order of orders) {
      try {
        const [items] = await dbPool.query(`
          SELECT oi.*, 
            p.name as product_name,
            p.image_url as product_image,
            c.name as product_category
          FROM OrderItems oi 
          JOIN Products p ON oi.product_id = p.id
          LEFT JOIN Categories c ON p.category_id = c.id
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
app.get('/api/orders/user/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const [orders] = await dbPool.query(
      `SELECT o.*, 
       (SELECT COUNT(*) FROM OrderItems WHERE order_id = o.id) as item_count
       FROM Orders o 
       WHERE o.user_id = ? 
       ORDER BY o.created_at DESC`,
      [user_id]
    );
    
    for (let order of orders) {
      const [items] = await dbPool.query(`
        SELECT oi.*,
          p.name as product_name,
          p.image_url as product_image,
          c.name as product_category
        FROM OrderItems oi
        JOIN Products p ON oi.product_id = p.id
        LEFT JOIN Categories c ON p.category_id = c.id
        WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    
    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
// Cancel order (only within 3 days)
app.put('/api/my-orders/:orderId/cancel', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      `SELECT id, status, created_at 
       FROM Orders 
       WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    const order = orderRows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    const orderDate = new Date(order.created_at);
    const now = new Date();
    const diffInDays = (now - orderDate) / (1000 * 60 * 60 * 24);

    if (diffInDays > 3) {
      return res.status(400).json({
        success: false,
        message: 'Order can only be cancelled within 3 days of purchase'
      });
    }

    const [items] = await connection.execute(
      'SELECT product_id, quantity FROM OrderItems WHERE order_id = ?',
      [orderId]
    );

    for (const item of items) {
      await connection.execute(
        'UPDATE Products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.execute(
      `UPDATE Orders 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = ?`,
      [orderId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/users/:id/address', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await dbPool.getConnection(); 
    const { id } = req.params;
    const { shipping_address } = req.body;
    
    const [result] = await connection.execute(
      'UPDATE Users SET shipping_address = ? WHERE id = ?',
      [shipping_address, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shipping address updated successfully'
    });
    
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating address'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/my-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📦 Fetching orders for user ID: ${userId}`);
    
    const [orders] = await dbPool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.payment_method,
        o.payment_status,
        o.shipping_address,
        o.created_at
      FROM Orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    
    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    
    for (let order of orders) {
      const [itemCountRows] = await dbPool.query(
        'SELECT COUNT(*) as count, SUM(quantity) as total_items FROM OrderItems WHERE order_id = ?',
        [order.id]
      );
      
      order.item_count = itemCountRows[0]?.count || 0;
      order.total_items = itemCountRows[0]?.total_items || 0;
      
      
      const [items] = await dbPool.query(`
        SELECT 
          oi.*,
          p.name as product_name,
          p.image_url as product_image,
          p.description as product_description,
          c.name as product_category
        FROM OrderItems oi
        LEFT JOIN Products p ON oi.product_id = p.id
        LEFT JOIN Categories c ON p.category_id = c.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items;
    }
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
    
  } catch (err) {
    console.error('Get my orders error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get('/api/my-orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.orderId;
    
    console.log(`📦 Fetching order ${orderId} for user ${userId}`);
    
    // Verify order belongs to user
    const [orderRows] = await dbPool.query(`
      SELECT 
        o.*,
        u.full_name,
        u.email,
        u.phone
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `, [orderId, userId]);
    
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }
    
    const order = orderRows[0];
    
    const [items] = await dbPool.query(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.image_url as product_image,
        p.description as product_description,
        c.name as product_category
      FROM OrderItems oi
      LEFT JOIN Products p ON oi.product_id = p.id
      LEFT JOIN Categories c ON p.category_id = c.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    order.items = items;
    
    // Get item count
    const [countRows] = await dbPool.query(
      'SELECT COUNT(*) as item_count FROM OrderItems WHERE order_id = ?',
      [orderId]
    );
    order.item_count = countRows[0]?.item_count || 0;
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (err) {
    console.error('Get order details error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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