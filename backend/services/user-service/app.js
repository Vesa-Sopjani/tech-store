// backend/services/user-service/app.js
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
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');
const cookieParser = require('cookie-parser'); // ✅ Import i rëndësishëm

// Import routes
const captchaRoutes = require('./routes/captcha');
const authRoutes = require('./routes/authRoutes');

// Import middlewares
const authenticateToken = require('../../middlewares/authenticateToken');

// Services
const kafkaService = require('./kafka-service');
const captchaService = require('./captcha-service');
const CacheManager = require('./cacheManager');

const app = express();
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const userRegistrationsCounter = new promClient.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status']
});

const userLoginsCounter = new promClient.Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['method', 'status']
});

register.registerMetric(userRegistrationsCounter);
register.registerMetric(userLoginsCounter);

// Config - PËRDOR .env VARIABLES
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_default_change_this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_default_change_this';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Database pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

// Cache manager
const cacheManager = new CacheManager();

// ==================== MIDDLEWARE CONFIGURATION ====================

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// backend/services/user-service/app.js
// ... imports ...

// ==================== MIDDLEWARE CONFIGURATION ====================

// Rendi i duhur i middleware:
app.use(helmet({
  contentSecurityPolicy: false, // ✅ Disable CSP temporarily for testing
  crossOriginEmbedderPolicy: false
}));

// ✅ Së pari CORS me headers të lejuara
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',           // ✅ Lejo këtë header
    'X-Request-ID',        // ✅ Lejo këtë header  
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization', 'Set-Cookie'] // Headers që frontend mund të lexojë
}));

// Pastaj cookieParser dhe express.json
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Handle OPTIONS requests (preflight) manualisht
app.options('*', cors()); // Lejo të gjitha OPTIONS requests


// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 80,
  message: { success: false, message: 'Too many login attempts' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});

app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

// ==================== SERVICE INITIALIZATION ====================

const initializeServices = async () => {
  try {
    await cacheManager.initialize();
    console.log(`✅ Cache initialized: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
    
    // Test database connection
    const connection = await pool.getConnection();
    connection.release();
    console.log('✅ Database connected');
    
    // Initialize Kafka (optional)
    if (kafkaService.initialize) {
      await kafkaService.initialize();
    }
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
};

// ==================== TEST ROUTES ====================

// Test route për cookies debugging
app.get('/api/debug/cookies', (req, res) => {
  console.log('🍪 Cookies received:', req.cookies);
  res.json({ 
    cookies: req.cookies,
    headers: req.headers
  });
});

// Test route për CORS
app.options('/api/test-cors', cors()); // Enable pre-flight
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working',
    cookies: req.cookies 
  });
});

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'UP',
      cache: cacheManager.isRedisAvailable() ? 'REDIS' : 'MEMORY',
      kafka: kafkaService ? 'AVAILABLE' : 'NOT_CONFIGURED'
    },
    version: '2.0.0'
  };

  res.json(health);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ==================== EVENT & AUDIT ROUTES ====================

// Event publishing endpoint (for frontend)
app.post('/api/events/publish', async (req, res) => {
  try {
    const { eventType, data, source } = req.body;
    
    console.log(`📨 Event received from ${source}: ${eventType}`);
    
    // Publish to Kafka if available
    let success = true;
    if (kafkaService.publishEvent) {
      success = await kafkaService.publishEvent('frontend-events', {
        eventType,
        data,
        source,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    // Store in database
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO Events (event_type, event_data, source, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [eventType, JSON.stringify(data), source, req.ip, req.headers['user-agent']]
    );
    connection.release();
    
    res.json({ success, message: 'Event processed' });
  } catch (error) {
    console.error('Event publishing error:', error);
    res.status(500).json({ success: false, message: 'Failed to process event' });
  }
});

// Audit log endpoint
app.post('/api/audit/log', authenticateToken, async (req, res) => {
  try {
    const { action, details, service } = req.body;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO AuditLogs (action, details, user_id, service, ip_address) VALUES (?, ?, ?, ?, ?)',
      [action, JSON.stringify(details), req.user.id, service || 'user-service', req.ip]
    );
    connection.release();
    
    // Publish to Kafka
    if (kafkaService.publishEvent) {
      await kafkaService.publishEvent('audit-logs', {
        action, details, userId: req.user.id, service, timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ success: false });
  }
});

// ==================== AUTH ROUTES (PËRDOR ROUTES TË RIAKTIVIZUARA) ====================

// ✅ Përdor authRoutes të importuara (që përmbajnë login, register, refresh, logout)
app.use('/api/auth', authRoutes);

// ✅ Profile route me middleware të ri
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    // Try cache first
    const cachedUser = await cacheManager.get(`user:${req.user.id}`);
    if (cachedUser) {
      return res.json({ 
        success: true, 
        data: cachedUser, 
        source: 'cache' 
      });
    }
    
    // Database fallback
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, username, email, full_name, role, created_at FROM Users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    await cacheManager.set(`user:${user.id}`, user);
    
    res.json({ 
      success: true, 
      data: user, 
      source: 'database' 
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  } finally {
    if (connection) connection.release();
  }
});

// ✅ User validation route (për frontend)
app.get('/api/auth/validate', authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: req.user
  });
});

// ==================== CAPTCHA ROUTES ====================
app.use('/api/captcha', captchaRoutes);

// ==================== DEFAULT & ERROR HANDLERS ====================

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'User Service API - Tech Store',
    version: '2.0.0',
    endpoints: {
      auth: 'POST /api/auth/login, /api/auth/register, /api/auth/refresh, /api/auth/logout',
      profile: 'GET /api/users/profile (authenticated)',
      health: 'GET /health',
      metrics: 'GET /metrics',
      debug: 'GET /api/debug/cookies'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== SERVER START ====================

const startServer = async () => {
  try {
    await initializeServices();
    
    const startPort = parseInt(process.env.PORT) || 5003;
    
    const getAvailablePort = (port) => {
      return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            resolve(getAvailablePort(port + 1));
          } else {
            reject(err);
          }
        });
        server.once('listening', () => {
          server.close(() => resolve(port));
        });
        server.listen(port);
      });
    };
    
    const PORT = await getAvailablePort(startPort);
    
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`);
      console.log(`🍪 Cookie debug: http://localhost:${PORT}/api/debug/cookies`);
      console.log(`🌐 CORS: Enabled for ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`🔑 JWT Secrets: ${JWT_ACCESS_SECRET ? 'Configured' : 'Using defaults'}`);
      console.log(`💾 Cache: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();