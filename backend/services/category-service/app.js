// category-service/app.js
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
      console.log(`Category service circuit breaker OPEN for ${this.resetTimeout}ms`);
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
        console.log('✅ Redis connected for category-service');
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
const cacheCategory = async (categoryId, categoryData, ttl = 7200) => {
  await cacheManager.set(`category:${categoryId}`, categoryData, ttl);
};

const getCachedCategory = async (categoryId) => {
  return await cacheManager.get(`category:${categoryId}`);
};

const cacheCategoryList = async (categories, ttl = 3600) => {
  await cacheManager.set('categories:all', categories, ttl);
};

const getCachedCategoryList = async () => {
  return await cacheManager.get('categories:all');
};

const invalidateCategoryCache = async (categoryId) => {
  await cacheManager.del(`category:${categoryId}`);
  await cacheManager.del('categories:all');
  // Also invalidate products by category cache
  await cacheManager.del(`category:${categoryId}:products`);
};

// Helper function to get icon based on category name
const getCategoryIcon = (categoryName) => {
  const iconMap = {
    'Laptop': '💻',
    'Telefon': '📱',
    'Tablet': '📟',
    'Aksesorë': '🎧',
    'Smartphones': '📱',
    'Laptops': '💻',
    'Audio': '🎧',
    'Wearables': '⌚',
    'Gaming': '🎮',
    'Cameras': '📸',
    'TV & Home': '📺',
    'Drones': '🚁',
    'Computer': '🖥️',
    'Electronics': '🔌',
    'Gaming Consoles': '🎮',
    'Headphones': '🎧',
    'Monitors': '🖥️',
    'Printers': '🖨️',
    'Routers': '📡',
    'Smart Home': '🏠',
    'Storage': '💾'
  };
  
  return iconMap[categoryName] || '📦';
};

// ==================== SECURITY MIDDLEWARE ====================
const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many category requests'
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
// ==================== MIDDLEWARE SETUP ====================
// 1. Security headers
// ==================== MIDDLEWARE SETUP ====================
// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. Cookie parser - IMPORTANT: MUST BE BEFORE CORS
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 3. JSON parser
app.use(express.json());


// 4. CORS with specific configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true, // Allow cookies/auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept', 'Origin', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 5. Rate limiting for categories endpoint
app.use('/api/categories/', categoryLimiter);

// ==================== AUTHENTICATION MIDDLEWARE ====================
// category-service/app.js - Modifiko authenticateAdmin middleware

const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('🔐 Admin authentication requested');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    // Provo së pari me Authorization header
    const authHeader = req.headers['authorization'];
    console.log('Authorization header:', authHeader);
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token extracted from header:', token ? 'Yes' : 'No');
    }
    
    // Nëse nuk ka token, kthe error
    if (!token) {
      console.error('❌ No token provided in request');
      return res.status(401).json({
        success: false,
        message: 'Admin access token required',
        debug: {
          headers: Object.keys(req.headers),
          hasAuthHeader: !!authHeader
        }
      });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded successfully');
      console.log('Decoded token data:', {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        exp: decoded.exp,
        expiresIn: new Date(decoded.exp * 1000).toLocaleString()
      });
      
      if (decoded.role !== 'admin') {
        console.error('❌ User is not admin, role:', decoded.role);
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      req.user = decoded;
      console.log('✅ Admin authentication successful');
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification error:', jwtError.message);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
        error: jwtError.message
      });
    }
  } catch (err) {
    console.error('❌ Admin auth error:', err);
    return res.status(403).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// ==================== ROUTES ====================

// Merr të gjitha kategoritë me cache
app.get('/api/categories', async (req, res) => {
  try {
    // Try cache first
    const cachedCategories = await getCachedCategoryList();
    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories,
        source: 'cache'
      });
    }

    // Database fallback
    const categories = await dbCircuitBreaker.exec(() => getCategoriesFromDatabase());
    
    // Add icon and transform data for frontend
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon || getCategoryIcon(category.name),
      product_count: 0, // Will be populated from product-service
      is_active: category.is_active,
      created_at: category.created_at
    }));
    
    await cacheCategoryList(transformedCategories);
    
    res.json({
      success: true,
      data: transformedCategories,
      total: transformedCategories.length,
      source: 'database'
    });
    
  } catch (err) {
    console.error('Get categories error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Category service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Merr kategori sipas ID me cache
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    const cachedCategory = await getCachedCategory(id);
    if (cachedCategory) {
      return res.json({
        success: true,
        data: cachedCategory,
        source: 'cache'
      });
    }

    // Database fallback
    const category = await dbCircuitBreaker.exec(() => getCategoryFromDatabase(id));
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Add icon and transform
    const transformedCategory = {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon || getCategoryIcon(category.name),
      is_active: category.is_active,
      created_at: category.created_at,
      updated_at: category.updated_at
    };

    // Cache the result
    await cacheCategory(id, transformedCategory);
    
    res.json({
      success: true,
      data: transformedCategory,
      source: 'database'
    });
  } catch (err) {
    console.error('Get category error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'Category service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Krijo kategori të re (admin)
app.post('/api/categories', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { name, description, icon } = req.body;
    
    const [result] = await connection.execute(
      `INSERT INTO Categories (name, description, icon, is_active)
       VALUES (?, ?, ?, ?)`,
      [name, description, icon || getCategoryIcon(name), true]
    );
    
    // Merr kategorinë e sapo krijuar
    const [rows] = await connection.execute(
      'SELECT * FROM Categories WHERE id = ?',
      [result.insertId]
    );
    
    const newCategory = rows[0];
    
    // Invalidate cache
    await invalidateCategoryCache(newCategory.id);
    
    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
    
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating category'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Përditëso kategori (admin)
app.put('/api/categories/:id', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    const { name, description, icon, is_active } = req.body;
    
    const [result] = await connection.execute(
      `UPDATE Categories 
       SET name = ?, description = ?, icon = ?, is_active = ?
       WHERE id = ?`,
      [name, description, icon || getCategoryIcon(name), is_active, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Merr kategorinë e përditësuar
    const [rows] = await connection.execute(
      'SELECT * FROM Categories WHERE id = ?',
      [id]
    );
    
    const updatedCategory = rows[0];
    
    // Invalidate cache
    await invalidateCategoryCache(id);
    
    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});



// Fshi kategori (admin - soft delete)
app.delete('/api/categories/:id', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    
    const [result] = await connection.execute(
      'UPDATE Categories SET is_active = FALSE WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Invalidate cache
    await invalidateCategoryCache(id);
    
    res.json({
      success: true,
      message: 'Category deactivated successfully'
    });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Merr produktet sipas kategorisë (me cache)
app.get('/api/categories/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `category:${id}:products`;
    
    // Try cache first
    const cachedProducts = await cacheManager.get(cacheKey);
    if (cachedProducts) {
      return res.json({
        success: true,
        data: cachedProducts,
        source: 'cache'
      });
    }

    // Database fallback
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT p.*, c.name as category_name 
       FROM Products p 
       LEFT JOIN Categories c ON p.category_id = c.id 
       WHERE p.category_id = ? AND c.is_active = TRUE
       ORDER BY p.created_at DESC`,
      [id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found for this category'
      });
    }
    
    // Cache the result
    await cacheManager.set(cacheKey, rows, 1800); // 30 minutes cache
    
    res.json({
      success: true,
      data: rows,
      total: rows.length,
      source: 'database'
    });
  } catch (err) {
    console.error('Get category products error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Kërko kategori
app.get('/api/categories/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    const categories = await dbCircuitBreaker.exec(() => searchCategories(query));
    
    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (err) {
    console.error('Search categories error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Kategoritë më të popullara (sipas numrit të produkteve)
app.get('/api/categories/popular', async (req, res) => {
  try {
    const [popularCategories] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS product_count
      FROM Categories c
      LEFT JOIN Products p ON p.category_id = c.id
      LEFT JOIN OrderItems oi ON oi.product_id = p.id
      LEFT JOIN Orders o ON o.id = oi.order_id
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY product_count DESC
      LIMIT 5
    `);

    res.json({ success: true, data: popularCategories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




// Analytics për kategori
app.get('/api/categories/analytics/overview', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [totalCategories] = await connection.execute(
      'SELECT COUNT(*) as count FROM Categories WHERE is_active = TRUE'
    );
    
    const [categoriesWithProducts] = await connection.execute(`
      SELECT COUNT(DISTINCT c.id) as count 
      FROM Categories c 
      INNER JOIN Products p ON c.id = p.category_id 
      WHERE c.is_active = TRUE
    `);
    
    const [categoryStats] = await connection.execute(`
      SELECT 
        c.name,
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.stock_quantity), 0) as total_stock,
        COALESCE(AVG(p.price), 0) as avg_price
      FROM Categories c
      LEFT JOIN Products p ON c.id = p.category_id
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY product_count DESC
    `);
    
    res.json({
      success: true,
      data: {
        totalCategories: totalCategories[0].count,
        activeCategories: totalCategories[0].count,
        categoriesWithProducts: categoriesWithProducts[0].count,
        categoryStats: categoryStats
      }
    });
  } catch (err) {
    console.error('Category analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting category analytics'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Helper functions
async function getCategoriesFromDatabase() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM Categories WHERE is_active = TRUE ORDER BY name ASC'
    );
    return rows;
  } finally {
    connection.release();
  }
}

async function getCategoryFromDatabase(categoryId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM Categories WHERE id = ? AND is_active = TRUE',
      [categoryId]
    );
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
}

async function searchCategories(query) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM Categories 
       WHERE (name LIKE ? OR description LIKE ?) 
       AND is_active = TRUE 
       ORDER BY name ASC`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  } finally {
    connection.release();
  }
}

// 🩺 HEALTH CHECK
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'category-service',
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
    category_service_requests_total: 0,
    category_service_searches_total: 0,
    category_service_cache_hits_total: 0,
    category_service_errors_total: 0,
    category_service_circuit_breaker_state: dbCircuitBreaker.getState() === 'CLOSED' ? 0 : 1,
    category_service_cache_type: cacheManager.isRedisAvailable() ? 1 : 0,
    category_service_active_categories_total: 0
  };

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM Categories WHERE is_active = TRUE');
    connection.release();
    metrics.category_service_active_categories_total = rows[0].count;
  } catch (err) {
    // Ignore error in metrics
  }

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
    message: 'Category Service API - Tech Store', 
    version: '1.0.0',
    cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
    endpoints: {
      getAllCategories: 'GET /api/categories',
      getCategory: 'GET /api/categories/:id',
      createCategory: 'POST /api/categories',
      updateCategory: 'PUT /api/categories/:id',
      deleteCategory: 'DELETE /api/categories/:id',
      getCategoryProducts: 'GET /api/categories/:id/products',
      searchCategories: 'GET /api/categories/search/:query',
      popularCategories: 'GET /api/categories/popular',
      analytics: 'GET /api/categories/analytics/overview',
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
    console.log('✅ Category service connected to MySQL');
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
    const startPort = parseInt(process.env.PORT) || 5005; // Changed to 5005
    const PORT = await getAvailablePort(startPort);
    
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Category Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔒 Category management enabled`);
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
  console.log('\n🛑 Shutting down category service...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);