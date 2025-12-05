// order-service/app.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const net = require('net');
require('dotenv').config();

const app = express();

// ==================== PORT CONFIGURATION ====================
const getAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${startPort} is busy, trying ${startPort + 1}...`);
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    
    server.once('listening', () => {
      server.close(() => {
        resolve(startPort);
      });
    });
    
    server.listen(startPort);
  });
};

// ==================== CIRCUIT BREAKER ====================
class CircuitBreaker {
  constructor(timeout = 10000, failureThreshold = 3, resetTimeout = 30000) {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.timeout = timeout;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async exec(operation) {
    if (this.state === 'OPEN') {
      if (this.nextAttempt <= Date.now()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]);
      this.success();
      return result;
    } catch (err) {
      this.failure();
      throw err;
    }
  }

  success() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  failure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`Order service circuit breaker OPEN for ${this.resetTimeout}ms`);
    }
  }

  getState() {
    return this.state;
  }
}

// ==================== IN-MEMORY CACHE ====================
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  async set(key, value, ttl = 3600) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + (ttl * 1000));
    return true;
  }

  async get(key) {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  async del(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    return true;
  }
}

// ==================== CACHE MANAGER ====================
class CacheManager {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new MemoryCache();
    this.useRedis = false;
    this.initialized = false;
  }

  async initialize() {
    try {
      const redis = require('redis');
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log('❌ Redis connection failed, using memory cache');
              this.useRedis = false;
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        if (!this.initialized) {
          console.log('⚠️ Redis not available, using memory cache');
          this.useRedis = false;
        }
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected for order-service');
        this.useRedis = true;
      });

      await this.redisClient.connect();
      this.initialized = true;
      this.useRedis = true;
    } catch (err) {
      console.log('⚠️ Redis not available, using memory cache');
      this.useRedis = false;
      this.initialized = true;
    }
  }

  async set(key, value, ttl = 3600) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
      } catch (err) {
        return await this.memoryCache.set(key, value, ttl);
      }
    }
    return await this.memoryCache.set(key, value, ttl);
  }

  async get(key) {
    if (this.useRedis && this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
      } catch (err) {
        return await this.memoryCache.get(key);
      }
    }
    return await this.memoryCache.get(key);
  }

  async del(key) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (err) {
        return await this.memoryCache.del(key);
      }
    }
    return await this.memoryCache.del(key);
  }

  async isRedisAvailable() {
    return this.useRedis;
  }
}

const cacheManager = new CacheManager();

// Cache helper functions
const cacheOrder = async (orderId, orderData, ttl = 3600) => {
  await cacheManager.set(`order:${orderId}`, orderData, ttl);
};

const getCachedOrder = async (orderId) => {
  return await cacheManager.get(`order:${orderId}`);
};

const invalidateOrderCache = async (orderId) => {
  await cacheManager.del(`order:${orderId}`);
};

// ==================== SECURITY MIDDLEWARE ====================
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many order requests'
  }
});

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// ==================== DATABASE CONFIGURATION ====================
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Initialize services
const dbCircuitBreaker = new CircuitBreaker();

// ==================== MIDDLEWARE SETUP ====================
app.use(securityHeaders);
app.use(cors());
app.use(express.json());
app.use('/api/orders/', orderLimiter);

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// ==================== ROUTES ====================

// Krijo porosi të re
app.post('/api/orders', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { user_id, items, shipping_address, payment_method } = req.body;
    
    // Validate input
    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data'
      });
    }

    // Calculate total and validate stock using circuit breaker
    let total_amount = 0;
    const stockValidation = await dbCircuitBreaker.exec(async () => {
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
      return true;
    });

    // Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO Orders (user_id, total_amount, shipping_address, payment_method, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [user_id, total_amount, shipping_address, payment_method]
    );
    
    const orderId = orderResult.insertId;

    // Add order items and update stock
    for (const item of items) {
      const [productRows] = await connection.execute(
        'SELECT price FROM Products WHERE id = ?',
        [item.product_id]
      );
      
      const product = productRows[0];
      const itemTotal = product.price * item.quantity;
      
      // Add order item
      await connection.execute(
        `INSERT INTO OrderItems (order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, product.price, itemTotal]
      );
      
      // Update stock
      await connection.execute(
        'UPDATE Products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();

    // Get complete order details
    const finalOrder = await getOrderWithDetails(orderId);
    
    // Cache the order
    await cacheOrder(orderId, finalOrder);
    
    res.status(201).json({
      success: true,
      data: finalOrder,
      message: 'Order created successfully'
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Order creation error:', err);
    
    if (err.message.includes('Circuit breaker') || err.message.includes('timeout')) {
      res.status(503).json({
        success: false,
        message: 'Order service is temporarily busy, please try again'
      });
    } else {
      res.status(500).json({
        success: false,
        message: err.message || 'Server error creating order'
      });
    }
  } finally {
    connection.release();
  }
});

// Merr të gjitha porositë e një përdoruesi
app.get('/api/orders/user/:user_id', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { user_id } = req.params;
    
    const [rows] = await connection.execute(
      `SELECT o.*, 
       (SELECT COUNT(*) FROM OrderItems WHERE order_id = o.id) as item_count
       FROM Orders o 
       WHERE o.user_id = ? 
       ORDER BY o.created_at DESC`,
      [user_id]
    );
    
    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Merr porosi sipas ID me cache
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    const cachedOrder = await getCachedOrder(id);
    if (cachedOrder) {
      return res.json({
        success: true,
        data: cachedOrder,
        source: 'cache'
      });
    }

    // Database fallback
    const order = await dbCircuitBreaker.exec(() => getOrderWithDetails(id));
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Cache the result
    await cacheOrder(id, order);
    
    res.json({
      success: true,
      data: order,
      source: 'database'
    });
  } catch (err) {
    console.error('Get order error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Order service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Përditëso statusin e porosisë
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    const { status } = req.body;
    
    const [result] = await connection.execute(
      'UPDATE Orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Merr porosinë e përditësuar
    const [rows] = await connection.execute(
      'SELECT * FROM Orders WHERE id = ?',
      [id]
    );
    
    // Invalidate cache
    await invalidateOrderCache(id);
    
    res.json({
      success: true,
      data: rows[0],
      message: 'Order status updated'
    });
  } catch (err) {
    console.error('Order status update error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Order analytics
app.get('/api/orders/analytics/overview', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [todayOrders] = await connection.execute(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
      FROM Orders 
      WHERE DATE(created_at) = CURDATE()
    `);
    
    const [weeklyOrders] = await connection.execute(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
      FROM Orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    const [statusDistribution] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM Orders 
      GROUP BY status
    `);
    
    res.json({
      success: true,
      data: {
        today: todayOrders[0],
        weekly: weeklyOrders[0],
        statusDistribution
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting analytics'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Helper function to get order with details
async function getOrderWithDetails(orderId) {
  const connection = await pool.getConnection();
  
  try {
    const [orderRows] = await connection.execute(
      `SELECT o.*, u.username, u.full_name, u.email
       FROM Orders o
       LEFT JOIN Users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );
    
    if (orderRows.length === 0) {
      return null;
    }
    
    const order = orderRows[0];
    
    const [itemsRows] = await connection.execute(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM OrderItems oi
       LEFT JOIN Products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    order.items = itemsRows;
    return order;
  } finally {
    connection.release();
  }
}

// 🩺 HEALTH CHECK
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'UP',
      cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
      circuit_breaker: dbCircuitBreaker.getState()
    }
  };

  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
  } catch (err) {
    health.status = 'DOWN';
    health.checks.database = 'DOWN';
  }

  res.json(health);
});

// 📊 METRICS
app.get('/metrics', async (req, res) => {
  const metrics = {
    order_service_requests_total: 0,
    order_service_orders_created: 0,
    order_service_errors_total: 0,
    order_service_circuit_breaker_state: dbCircuitBreaker.getState() === 'CLOSED' ? 0 : 1,
    order_service_cache_type: cacheManager.isRedisAvailable() ? 1 : 0
  };

  res.set('Content-Type', 'text/plain');
  let output = '';
  for (const [key, value] of Object.entries(metrics)) {
    output += `${key} ${value}\n`;
  }
  res.send(output);
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Enhanced Order Service API - Tech Store', 
    version: '2.0.0',
    cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
    endpoints: {
      createOrder: 'POST /api/orders',
      getUserOrders: 'GET /api/orders/user/:user_id',
      getOrder: 'GET /api/orders/:id',
      updateOrderStatus: 'PUT /api/orders/:id/status',
      analytics: 'GET /api/orders/analytics/overview',
      health: 'GET /health',
      metrics: 'GET /metrics'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ==================== INITIALIZATION ====================
const initializeServices = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Order service connected to MySQL');
    connection.release();
    
    await cacheManager.initialize();
    console.log(`✅ Cache initialized: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
  } catch (err) {
    console.error('Service initialization error:', err);
  }
};

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    const startPort = parseInt(process.env.PORT) || 5002;
    const PORT = await getAvailablePort(startPort);
    
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Order Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔒 Order features enabled`);
      console.log(`💾 Cache: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
    });
    
    return PORT;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down order service...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);