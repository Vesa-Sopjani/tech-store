// user-service/app.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const net = require('net');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret_key_tech_store_2024_enhanced';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

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
      console.log(`User service circuit breaker OPEN for ${this.resetTimeout}ms`);
    }
  }

  getState() {
    return this.state;
  }
}

// ==================== IN-MEMORY CACHE (FALLBACK) ====================
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

  async exists(key) {
    return this.cache.has(key);
  }
}

// ==================== CACHE MANAGER (WITH REDIS FALLBACK) ====================
class CacheManager {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new MemoryCache();
    this.useRedis = false;
    this.initialized = false;
  }

  async initialize() {
    // Try to connect to Redis, fallback to memory cache if unavailable
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
        console.log('✅ Redis connected for user-service');
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
        console.log('Redis set failed, falling back to memory cache');
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
        console.log('Redis get failed, falling back to memory cache');
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
        console.log('Redis del failed, falling back to memory cache');
        return await this.memoryCache.del(key);
      }
    }
    return await this.memoryCache.del(key);
  }

  async isRedisAvailable() {
    return this.useRedis;
  }
}

// Create cache manager instance
const cacheManager = new CacheManager();

// Cache helper functions
const cacheUser = async (userId, userData, ttl = 3600) => {
  await cacheManager.set(`user:${userId}`, userData, ttl);
};

const getCachedUser = async (userId) => {
  return await cacheManager.get(`user:${userId}`);
};

const cacheSession = async (token, userData, ttl = 86400) => {
  await cacheManager.set(`session:${token}`, userData, ttl);
};

const getCachedSession = async (token) => {
  return await cacheManager.get(`session:${token}`);
};

const invalidateUserCache = async (userId) => {
  await cacheManager.del(`user:${userId}`);
};

// ==================== SECURITY MIDDLEWARE ====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP'
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

const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

const validateRegistration = (req, res, next) => {
  const { username, email, password, full_name } = req.body;
  
  const errors = [];
  
  if (!username || username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (!validator.isEmail(email)) {
    errors.push('Valid email is required');
  }
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!full_name || full_name.length < 2) {
    errors.push('Full name is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

// ==================== ADMIN INITIALIZATION ====================
async function initializeAdmin() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [adminUsers] = await connection.execute(
      'SELECT * FROM Users WHERE username = "admin"'
    );
    
    if (adminUsers.length === 0) {
      console.log('⚠️ Admin user not found. Creating...');
      
      const hashedPassword = await bcrypt.hash('Admin123!', BCRYPT_ROUNDS);
      
      await connection.execute(
        `INSERT INTO Users (username, email, password, full_name, role, address, phone) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'admin', 
          'admin@techstore.com', 
          hashedPassword,
          'System Administrator', 
          'admin',
          'Tirana, Albania',
          '+355691234567'
        ]
      );
      console.log('✅ Admin user created successfully!');
    } else {
      console.log('✅ Admin user already exists.');
    }
  } catch (err) {
    console.error('❌ Admin initialization error:', err);
  } finally {
    if (connection) connection.release();
  }
}

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
    // Check cache first
    const cachedSession = await getCachedSession(token);
    if (cachedSession) {
      req.user = cachedSession;
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data from database
    const user = await dbCircuitBreaker.exec(async () => {
      const connection = await pool.getConnection();
      try {
        const [users] = await connection.execute(
          'SELECT id, username, email, full_name, role, address, phone FROM Users WHERE id = ?',
          [decoded.id]
        );
        return users.length > 0 ? users[0] : null;
      } finally {
        connection.release();
      }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cache the session
    await cacheSession(token, user);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Token verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

// ==================== ROUTES ====================

// Enhanced registration with security
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { username, email, password, full_name, address, phone, role = 'customer' } = req.body;
    
    console.log(`📝 New registration: ${username}, email: ${email}`);
    
    // Check password strength
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }

    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM Users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Create user
    const [result] = await connection.execute(
      `INSERT INTO Users (username, email, password, full_name, address, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, full_name, address, phone, role]
    );
    
    // Get created user
    const [userRows] = await connection.execute(
      'SELECT id, username, email, full_name, role, address, phone, created_at FROM Users WHERE id = ?',
      [result.insertId]
    );
    
    const user = userRows[0];
    
    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Cache user data
    await cacheUser(user.id, user);
    await cacheSession(token, user);
    
    console.log('✅ New user registered:', user.username, 'Role:', user.role);
    
    res.status(201).json({
      success: true,
      data: {
        user: user,
        token
      },
      message: 'User registered successfully'
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Enhanced login with security
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { username, password } = req.body;
    
    console.log(`🔐 Login attempt: ${username}`);
    
    // Find user by username or email
    const [users] = await connection.execute(
      'SELECT * FROM Users WHERE username = ? OR email = ?',
      [username, username]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      address: user.address,
      phone: user.phone,
      created_at: user.created_at
    };
    
    // Cache user data and session
    await cacheUser(user.id, userData);
    await cacheSession(token, userData);
    
    console.log('✅ Successful login:', user.username, 'Role:', user.role);
    
    res.json({
      success: true,
      data: {
        user: userData,
        token
      },
      message: 'Login successful'
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Enhanced get user profile with cache
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Try cache first
    const cachedUser = await getCachedUser(userId);
    if (cachedUser) {
      return res.json({
        success: true,
        data: cachedUser,
        source: 'cache'
      });
    }

    // Database fallback
    const user = await dbCircuitBreaker.exec(async () => {
      const connection = await pool.getConnection();
      try {
        const [users] = await connection.execute(
          'SELECT id, username, email, full_name, address, phone, role, created_at FROM Users WHERE id = ?',
          [userId]
        );
        return users.length > 0 ? users[0] : null;
      } finally {
        connection.release();
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cache the result
    await cacheUser(userId, user);
    
    res.json({
      success: true,
      data: user,
      source: 'database'
    });
    
  } catch (err) {
    console.error('Get profile error:', err);
    
    if (err.message.includes('Circuit breaker')) {
      res.status(503).json({
        success: false,
        message: 'User service is temporarily unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
});

// Enhanced update profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.user.id;
    const { email, full_name, address, phone } = req.body;
    
    // Validate email
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }
    
    const [result] = await connection.execute(
      `UPDATE Users 
       SET email = ?, full_name = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [email, full_name, address, phone, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated profile
    const [users] = await connection.execute(
      'SELECT id, username, email, full_name, address, phone, role FROM Users WHERE id = ?',
      [userId]
    );
    
    const updatedUser = users[0];
    
    // Invalidate cache
    await invalidateUserCache(userId);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
    
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Change password endpoint
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Get current user with password
    const [users] = await connection.execute(
      'SELECT * FROM Users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidCurrentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Validate new password strength
    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
    // Update password
    await connection.execute(
      'UPDATE Users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );
    
    // Invalidate all sessions for this user
    await invalidateUserCache(userId);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Enhanced check email availability
app.get('/api/users/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!validator.isEmail(email)) {
      return res.json({
        success: true,
        data: {
          exists: false,
          isAvailable: false,
          message: 'Invalid email format'
        }
      });
    }
    
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id FROM Users WHERE email = ?',
      [email]
    );
    connection.release();
    
    res.json({
      success: true,
      data: {
        exists: users.length > 0,
        isAvailable: users.length === 0
      }
    });
    
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Enhanced check username availability
app.get('/api/users/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id FROM Users WHERE username = ?',
      [username]
    );
    connection.release();
    
    res.json({
      success: true,
      data: {
        exists: users.length > 0,
        isAvailable: users.length === 0
      }
    });
    
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Enhanced refresh token
app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Cache new session
    await cacheSession(newToken, user);
    
    res.json({
      success: true,
      data: {
        token: newToken
      },
      message: 'Token refreshed successfully'
    });
    
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Logout endpoint (invalidate token)
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      await cacheManager.del(`session:${token}`);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Enhanced health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'user-service',
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

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  const metrics = {
    user_service_requests_total: 0,
    user_service_registrations_total: 0,
    user_service_logins_total: 0,
    user_service_cache_hits_total: 0,
    user_service_errors_total: 0,
    user_service_circuit_breaker_state: dbCircuitBreaker.getState() === 'CLOSED' ? 0 : 1,
    user_service_cache_type: cacheManager.isRedisAvailable() ? 1 : 0
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
    message: 'Enhanced User Service API - Tech Store', 
    version: '2.0.0',
    features: ['Redis Caching', 'Circuit Breaker', 'Rate Limiting', 'Security Headers', 'Password Hashing'],
    cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/users/profile',
      updateProfile: 'PUT /api/users/profile',
      changePassword: 'PUT /api/users/change-password',
      checkEmail: 'GET /api/users/check-email/:email',
      checkUsername: 'GET /api/users/check-username/:username',
      refreshToken: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
      health: 'GET /health',
      metrics: 'GET /metrics'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong! Please try again.'
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
    // Test database connection
    const connection = await pool.getConnection();
    console.log('✅ User service connected to MySQL');
    connection.release();
    
    // Initialize cache (will fallback to memory if Redis fails)
    await cacheManager.initialize();
    
    console.log(`✅ Cache initialized: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
  } catch (err) {
    console.error('❌ Service initialization error:', err);
  }
  
  await initializeAdmin();
};

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    const startPort = parseInt(process.env.PORT) || 5003;
    const PORT = await getAvailablePort(startPort);
    
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced User Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔒 Security features enabled`);
      console.log(`💾 Cache: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
      console.log('');
      console.log('🎛️  Admin Credentials:');
      console.log('   👤 Username: admin');
      console.log('   🔑 Password: Admin123!');
      console.log('   📧 Email: admin@techstore.com');
      console.log('');
    });
    
    return PORT;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down user service...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);