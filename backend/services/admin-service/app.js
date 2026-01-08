// admin-service/app.js
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
      console.log(`Admin service circuit breaker OPEN for ${this.resetTimeout}ms`);
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
        console.log('✅ Redis connected for admin-service');
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
const cacheStats = async (cacheKey, stats, ttl = 300) => {
  await cacheManager.set(`stats:${cacheKey}`, stats, ttl);
};

const getCachedStats = async (cacheKey) => {
  return await cacheManager.get(`stats:${cacheKey}`);
};

const invalidateStatsCache = async () => {
  const keys = ['overview', 'realtime', 'monthly'];
  for (const key of keys) {
    await cacheManager.del(`stats:${key}`);
  }
};

// ==================== SECURITY MIDDLEWARE ====================
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many admin requests'
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
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Initialize services
const dbCircuitBreaker = new CircuitBreaker();

// ==================== MIDDLEWARE SETUP ====================
app.use(securityHeaders);
app.use(cors());
app.use(express.json());
app.use('/api/admin/', adminLimiter);

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin access token required'
    });
  }

  try {
    // In a real scenario, verify with user service
    // For now, we'll use a simple mock verification
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

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

// 📊 STATISTIKAT E PËRGJITHSHME me cache
app.get('/api/admin/statistics', authenticateAdmin, async (req, res) => {
  try {
    const cacheKey = 'overview';
    const cachedStats = await getCachedStats(cacheKey);
    
    if (cachedStats) {
      return res.json({
        success: true,
        data: cachedStats,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }

    const stats = await dbCircuitBreaker.exec(async () => {
      const connection = await pool.getConnection();
      try {
        const [totalUsers] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        const [totalProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products');
        const [totalOrders] = await connection.execute('SELECT COUNT(*) as count FROM Orders');
        const [totalRevenue] = await connection.execute('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM Orders WHERE status = "completed"');
        const [lowStockProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products WHERE stock_quantity < 10');
        
        const [monthlyOrders] = await connection.execute(`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as revenue
          FROM Orders 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month DESC
        `);
        
        const [topProducts] = await connection.execute(`
          SELECT 
            p.name,
            p.id,
            COALESCE(SUM(oi.quantity), 0) as total_sold,
            COALESCE(SUM(oi.total_price), 0) as total_revenue
          FROM Products p
          LEFT JOIN OrderItems oi ON p.id = oi.product_id
          LEFT JOIN Orders o ON oi.order_id = o.id AND o.status = 'completed'
          GROUP BY p.id, p.name
          ORDER BY total_sold DESC
          LIMIT 10
        `);
        
        const [newUsers] = await connection.execute(`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m-%d') as date,
            COUNT(*) as user_count
          FROM Users 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date
        `);

        return {
          overview: {
            totalUsers: totalUsers[0].count,
            totalProducts: totalProducts[0].count,
            totalOrders: totalOrders[0].count,
            totalRevenue: totalRevenue[0].revenue,
            lowStockProducts: lowStockProducts[0].count
          },
          monthlyOrders,
          topProducts,
          newUsers
        };
      } finally {
        connection.release();
      }
    });

    await cacheStats(cacheKey, stats);
    
    res.json({
      success: true,
      data: stats,
      source: 'database',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Statistics error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Admin service is temporarily unavailable'
      });
    } else {
      // Fallback data
      const fallbackData = {
        overview: {
          totalUsers: 0,
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          lowStockProducts: 0
        },
        monthlyOrders: [],
        topProducts: [],
        newUsers: []
      };
      
      res.status(200).json({
        success: true,
        data: fallbackData,
        source: 'fallback'
      });
    }
  }
});

// 📦 TË GJITHA POROSITË me pagination
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        o.*,
        u.username,
        u.email,
        u.full_name,
        COUNT(oi.id) as items_count
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.id
      LEFT JOIN OrderItems oi ON o.id = oi.order_id
    `;
    
    const params = [];
    
    if (status) {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [orders] = await connection.execute(query, params);
    
    // Merr artikujt për çdo porosi
    for (let order of orders) {
      const [items] = await connection.execute(`
        SELECT oi.*, p.name as product_name, p.image_url
        FROM OrderItems oi
        LEFT JOIN Products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = items;
    }
    
    // Total count për pagination
    const [totalCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM Orders' + (status ? ' WHERE status = ?' : ''),
      status ? [status] : []
    );
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (err) {
    console.error('Orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 👥 TË GJITHË PËRDORUESIT
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const [users] = await connection.execute(`
      SELECT 
        u.*,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM Users u
      LEFT JOIN Orders o ON u.id = o.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    const [totalCount] = await connection.execute('SELECT COUNT(*) as count FROM Users');
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 🕒 TË DHËNA NË KOHË REALE me cache
app.get('/api/admin/realtime', authenticateAdmin, async (req, res) => {
  try {
    const cacheKey = 'realtime';
    const cachedData = await getCachedStats(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        source: 'cache'
      });
    }

    const realtimeData = await dbCircuitBreaker.exec(async () => {
      const connection = await pool.getConnection();
      try {
        const [recentOrders] = await connection.execute(`
          SELECT 
            o.id,
            o.total_amount,
            o.status,
            o.created_at,
            u.username,
            u.full_name
          FROM Orders o
          JOIN Users u ON o.user_id = u.id
          WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          ORDER BY o.created_at DESC
          LIMIT 10
        `);
        
        const [userActivity] = await connection.execute(`
          SELECT 
            u.username,
            COUNT(o.id) as order_count,
            MAX(o.created_at) as last_order
          FROM Users u
          LEFT JOIN Orders o ON u.id = o.user_id
          WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY u.id, u.username
          ORDER BY order_count DESC
          LIMIT 10
        `);
        
        const [todayOrders] = await connection.execute(`
          SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
          FROM Orders 
          WHERE DATE(created_at) = CURDATE()
        `);
        
        const [weeklyRevenue] = await connection.execute(`
          SELECT COALESCE(SUM(total_amount), 0) as revenue 
          FROM Orders 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND status = 'completed'
        `);

        return {
          recentOrders,
          userActivity,
          quickStats: {
            todayOrders: todayOrders[0].count,
            todayRevenue: todayOrders[0].revenue,
            weeklyRevenue: weeklyRevenue[0].revenue
          }
        };
      } finally {
        connection.release();
      }
    });

    await cacheStats(cacheKey, realtimeData, 60); // Cache for 1 minute
    
    res.json({
      success: true,
      data: realtimeData,
      source: 'database'
    });
    
  } catch (err) {
    console.error('Realtime data error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 🔄 PËRDITËSO STATUSIN E POROSISË
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
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
    
    // Invalidate relevant caches
    await invalidateStatsCache();
    
    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
    
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 🩺 HEALTH CHECK
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'admin-service',
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
    admin_service_requests_total: 0,
    admin_service_statistics_requests: 0,
    admin_service_errors_total: 0,
    admin_service_circuit_breaker_state: dbCircuitBreaker.getState() === 'CLOSED' ? 0 : 1,
    admin_service_cache_type: cacheManager.isRedisAvailable() ? 1 : 0
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
    message: 'Enhanced Admin Service API - Tech Store', 
    version: '2.0.0',
    cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
    endpoints: {
      statistics: 'GET /api/admin/statistics',
      orders: 'GET /api/admin/orders',
      users: 'GET /api/admin/users',
      realtime: 'GET /api/admin/realtime',
      updateOrderStatus: 'PUT /api/admin/orders/:id/status',
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
    console.log('✅ Admin service connected to MySQL');
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
    const startPort = parseInt(process.env.PORT) || 5004;
    const PORT = await getAvailablePort(startPort);
    
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Admin Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔒 Admin features enabled`);
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
  console.log('\n🛑 Shutting down admin service...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);