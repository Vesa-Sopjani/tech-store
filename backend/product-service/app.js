// product-service/app.js
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
      console.log(`Product service circuit breaker OPEN for ${this.resetTimeout}ms`);
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
        console.log('✅ Redis connected for product-service');
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
const cacheProduct = async (productId, productData, ttl = 3600) => {
  await cacheManager.set(`product:${productId}`, productData, ttl);
};

const getCachedProduct = async (productId) => {
  return await cacheManager.get(`product:${productId}`);
};

const cacheProductList = async (cacheKey, products, ttl = 1800) => {
  await cacheManager.set(`products:${cacheKey}`, products, ttl);
};

const getCachedProductList = async (cacheKey) => {
  return await cacheManager.get(`products:${cacheKey}`);
};

const cacheCategories = async (categories, ttl = 7200) => {
  await cacheManager.set('categories:all', categories, ttl);
};

const getCachedCategories = async () => {
  return await cacheManager.get('categories:all');
};

const invalidateProductCache = async (productId) => {
  await cacheManager.del(`product:${productId}`);
  // Invalidate all product lists (simplified approach)
  const keys = ['all', 'featured', 'latest'];
  for (const key of keys) {
    await cacheManager.del(`products:${key}`);
  }
};

// ==================== SECURITY MIDDLEWARE ====================
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many product requests'
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
app.use('/api/products/', productLimiter);

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

// Merr të gjitha produktet me cache
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, page = 1, size = 20 } = req.query;
    
    const cacheKey = `list:${category || 'all'}:${minPrice || '0'}:${maxPrice || '9999'}:${page}:${size}`;
    const cachedProducts = await getCachedProductList(cacheKey);
    
    if (cachedProducts) {
      return res.json({
        success: true,
        data: cachedProducts,
        total: cachedProducts.length,
        source: 'cache'
      });
    }

    const products = await dbCircuitBreaker.exec(() => getProductsFromDatabase(req.query));
    await cacheProductList(cacheKey, products);
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      source: 'database'
    });
    
  } catch (err) {
    console.error('Get products error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Product service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Merr produkt sipas ID me cache
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    const cachedProduct = await getCachedProduct(id);
    if (cachedProduct) {
      return res.json({
        success: true,
        data: cachedProduct,
        source: 'cache'
      });
    }

    // Database fallback
    const product = await dbCircuitBreaker.exec(() => getProductFromDatabase(id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Cache the result
    await cacheProduct(id, product);
    
    res.json({
      success: true,
      data: product,
      source: 'database'
    });
  } catch (err) {
    console.error('Get product error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Product service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Krijo produkt të ri (admin)
app.post('/api/products', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
    
    const [result] = await connection.execute(
      `INSERT INTO Products (name, description, price, category_id, stock_quantity, image_url, specifications)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, stock_quantity, image_url, JSON.stringify(specifications)]
    );
    
    // Merr produktin e sapo krijuar
    const [rows] = await connection.execute(
      'SELECT * FROM Products WHERE id = ?',
      [result.insertId]
    );
    
    const newProduct = rows[0];
    
    // Invalidate cache
    await invalidateProductCache(newProduct.id);
    
    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    });
    
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating product'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Përditëso produkt (admin)
app.put('/api/products/:id', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
    
    const [result] = await connection.execute(
      `UPDATE Products 
       SET name = ?, description = ?, price = ?, category_id = ?, 
           stock_quantity = ?, image_url = ?, specifications = ?
       WHERE id = ?`,
      [name, description, price, category_id, stock_quantity, image_url, JSON.stringify(specifications), id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Merr produktin e përditësuar
    const [rows] = await connection.execute(
      'SELECT * FROM Products WHERE id = ?',
      [id]
    );
    
    const updatedProduct = rows[0];
    
    // Invalidate cache
    await invalidateProductCache(id);
    
    res.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Fshi produkt (admin)
app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    
    const [result] = await connection.execute(
      'DELETE FROM Products WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Invalidate cache
    await invalidateProductCache(id);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Merr të gjitha kategoritë me cache
app.get('/api/categories', async (req, res) => {
  try {
    // Try cache first
    const cachedCategories = await getCachedCategories();
    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories,
        source: 'cache'
      });
    }

    // Database fallback
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM Categories ORDER BY name');
    connection.release();
    
    await cacheCategories(rows);
    
    res.json({
      success: true,
      data: rows,
      source: 'database'
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Product analytics
app.get('/api/products/analytics/overview', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [totalProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products');
    const [lowStockProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products WHERE stock_quantity < 10');
    const [outOfStockProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products WHERE stock_quantity = 0');
    const [categoriesCount] = await connection.execute('SELECT COUNT(*) as count FROM Categories');
    
    const [priceStats] = await connection.execute(`
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price
      FROM Products
    `);
    
    res.json({
      success: true,
      data: {
        totalProducts: totalProducts[0].count,
        lowStockProducts: lowStockProducts[0].count,
        outOfStockProducts: outOfStockProducts[0].count,
        categoriesCount: categoriesCount[0].count,
        priceStats: priceStats[0]
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

// Helper functions
async function getProductsFromDatabase(filters) {
  const connection = await pool.getConnection();
  try {
    const { category, search, minPrice, maxPrice, page = 1, size = 20 } = filters;
    
    let query = `
      SELECT p.*, c.name as category_name 
      FROM Products p 
      LEFT JOIN Categories c ON p.category_id = c.id 
      WHERE 1=1
    `;
    
    const params = [];
    const offset = (page - 1) * size;
    
    if (category) {
      query += ` AND c.name = ?`;
      params.push(category);
    }
    
    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (minPrice) {
      query += ` AND p.price >= ?`;
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(parseFloat(maxPrice));
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(size), parseInt(offset));
    
    const [rows] = await connection.execute(query, params);
    return rows;
  } finally {
    connection.release();
  }
}

async function getProductFromDatabase(productId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT p.*, c.name as category_name 
       FROM Products p 
       LEFT JOIN Categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [productId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
}

// 🩺 HEALTH CHECK
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'product-service',
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
    product_service_requests_total: 0,
    product_service_searches_total: 0,
    product_service_cache_hits_total: 0,
    product_service_errors_total: 0,
    product_service_circuit_breaker_state: dbCircuitBreaker.getState() === 'CLOSED' ? 0 : 1,
    product_service_cache_type: cacheManager.isRedisAvailable() ? 1 : 0
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
    message: 'Enhanced Product Service API - Tech Store', 
    version: '2.0.0',
    cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
    endpoints: {
      getProducts: 'GET /api/products',
      getProduct: 'GET /api/products/:id',
      createProduct: 'POST /api/products',
      updateProduct: 'PUT /api/products/:id',
      deleteProduct: 'DELETE /api/products/:id',
      getCategories: 'GET /api/categories',
      analytics: 'GET /api/products/analytics/overview',
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
    console.log('✅ Product service connected to MySQL');
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
    const startPort = parseInt(process.env.PORT) || 5001;
    const PORT = await getAvailablePort(startPort);
    
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Product Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔒 Product features enabled`);
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
  console.log('\n🛑 Shutting down product service...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);