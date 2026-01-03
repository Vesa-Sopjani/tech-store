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
const cookieParser = require('cookie-parser');
const promBundle = require('express-prom-bundle');

// Import routes
const captchaRoutes = require('./routes/captcha');
const authRoutes = require('./routes/authRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');

// Import middlewares
const authenticateToken = require('../../middlewares/authenticateToken');

// Services
const kafkaService = require('./kafka-service');
const captchaService = require('./captcha-service');
const CacheManager = require('./cacheManager');

// ==================== PROMETHEUS CONFIGURATION ====================
// Krijo middleware për metrika automatikisht
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { 
    project: 'tech-store',
    service: 'user-service'
  },
  promClient: {
    collectDefaultMetrics: {
      timeout: 1000
    }
  }
});

// Registry për custom metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const userRegistrationsCounter = new promClient.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status', 'method']
});

const userLoginsCounter = new promClient.Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['method', 'status']
});

const activeSessionsGauge = new promClient.Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions'
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Regjistro custom metrics
register.registerMetric(userRegistrationsCounter);
register.registerMetric(userLoginsCounter);
register.registerMetric(activeSessionsGauge);
register.registerMetric(httpRequestDuration);

// ==================== EXPRESS APP INITIALIZATION ====================
const app = express();

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

// 1. Logging middleware (së pari)
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = uuidv4();
  req.requestId = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Regjistro metrikën e kohës së përgjigjes
    httpRequestDuration
      .labels(req.method, req.path, res.statusCode)
      .observe(duration / 1000);
  });
  
  next();
});

// 2. Prometheus metrics middleware (pas logging)
app.use(metricsMiddleware);

// 3. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  } : false,
  crossOriginEmbedderPolicy: false
}));

// 4. CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Request-ID',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization', 'Set-Cookie']
};

app.use(cors(corsOptions));

// 5. Handle OPTIONS requests (preflight)
app.options('*', cors(corsOptions));

// 6. Cookie parser
app.use(cookieParser());

// 7. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 8. Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 80,
  message: { success: false, message: 'Too many login attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
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
    if (kafkaService && kafkaService.initialize) {
      await kafkaService.initialize();
    }
    
    // Initialize session counter
    activeSessionsGauge.set(0);
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
};

// ==================== HEALTH CHECK ENDPOINT ====================

app.get('/health', async (req, res) => {
  const healthChecks = {
    database: false,
    cache: false,
    kafka: false,
    service: true
  };
  
  try {
    // Check database
    const connection = await pool.getConnection();
    const [result] = await connection.query('SELECT 1 as health');
    connection.release();
    healthChecks.database = result[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    healthChecks.database = false;
  }
  
  // Check cache
  healthChecks.cache = cacheManager.isRedisAvailable();
  
  // Check Kafka (optional)
  healthChecks.kafka = kafkaService && kafkaService.isAvailable ? true : false;
  
  const isHealthy = Object.values(healthChecks).every(check => check === true);
  
  const health = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    checks: healthChecks,
    version: '2.0.0',
    uptime: process.uptime(),
    metrics: {
      userRegistrations: userRegistrationsCounter.hashMap,
      userLogins: userLoginsCounter.hashMap,
      activeSessions: activeSessionsGauge.hashMap
    }
  };

  res.status(isHealthy ? 200 : 503).json(health);
});

// ==================== METRICS ENDPOINT ====================

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).end();
  }
});

// ==================== DEBUG ENDPOINTS ====================

// Test route për cookies debugging
app.get('/api/debug/cookies', (req, res) => {
  console.log('🍪 Cookies received:', req.cookies);
  res.json({ 
    cookies: req.cookies,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Test route për CORS
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working',
    cookies: req.cookies,
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// System info endpoint
app.get('/api/system/info', authenticateToken, (req, res) => {
  res.json({
    service: 'user-service',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    metrics: {
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        debug: '/api/debug/cookies'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== EVENT & AUDIT ROUTES ====================

// Event publishing endpoint (for frontend)
app.post('/api/events/publish', async (req, res) => {
  try {
    const { eventType, data, source } = req.body;
    
    console.log(`📨 Event received from ${source}: ${eventType}`);
    
    // Publish to Kafka if available
    let kafkaSuccess = false;
    if (kafkaService && kafkaService.publishEvent) {
      kafkaSuccess = await kafkaService.publishEvent('frontend-events', {
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
    
    res.json({ 
      success: true, 
      kafkaPublished: kafkaSuccess,
      message: 'Event processed successfully' 
    });
    
  } catch (error) {
    console.error('Event publishing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Audit log endpoint
app.post('/api/audit/log', authenticateToken, async (req, res) => {
  try {
    const { action, details, service } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action is required' 
      });
    }
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO AuditLogs (action, details, user_id, service, ip_address) VALUES (?, ?, ?, ?, ?)',
      [action, JSON.stringify(details || {}), req.user.id, service || 'user-service', req.ip]
    );
    connection.release();
    
    // Publish to Kafka
    if (kafkaService && kafkaService.publishEvent) {
      await kafkaService.publishEvent('audit-logs', {
        action, 
        details, 
        userId: req.user.id, 
        service, 
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
    }
    
    res.json({ 
      success: true,
      message: 'Audit log recorded successfully'
    });
    
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to record audit log'
    });
  }
});

// Get audit logs (admin only)
app.get('/api/audit/logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }
    
    const { page = 1, limit = 50, userId, action } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM AuditLogs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      query += ' AND action LIKE ?';
      params.push(`%${action}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const connection = await pool.getConnection();
    const [logs] = await connection.execute(query, params);
    connection.release();
    
    res.json({ 
      success: true, 
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length
      }
    });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch audit logs' 
    });
  }
});

// ==================== AUTH ROUTES ====================

app.use('/api/auth', authRoutes);

// Session tracking middleware (për active sessions)
app.use('/api/auth/', (req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/login')) {
    activeSessionsGauge.inc();
  } else if (req.method === 'POST' && req.path.includes('/logout')) {
    activeSessionsGauge.dec();
  }
  next();
});

// ==================== USER PROFILE ROUTE ====================

app.get('/api/users/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    // Try cache first
    const cacheKey = `user:${req.user.id}`;
    const cachedUser = await cacheManager.get(cacheKey);
    
    if (cachedUser) {
      console.log(`Cache hit for user ${req.user.id}`);
      return res.json({ 
        success: true, 
        data: cachedUser, 
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }
    
    // Database fallback
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, username, email, full_name, role, created_at, updated_at FROM Users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    
    // Cache the result
    await cacheManager.set(cacheKey, user, 300); // Cache for 5 minutes
    
    res.json({ 
      success: true, 
      data: user, 
      source: 'database',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// User validation route (për frontend)
app.get('/api/auth/validate', authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      full_name: req.user.full_name
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== ADMIN USER MANAGEMENT ROUTES ====================
app.use('/api/admin/users', authenticateToken, adminUserRoutes);

// ==================== CAPTCHA ROUTES ====================
app.use('/api/captcha', captchaRoutes);

// ==================== DEFAULT & ERROR HANDLERS ====================

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'User Service API - Tech Store',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        validate: 'GET /api/auth/validate (authenticated)'
      },
      profile: 'GET /api/users/profile (authenticated)',
      admin: 'GET /api/admin/users (admin only)',
      audit: 'GET /api/audit/logs (admin only)',
      events: 'POST /api/events/publish',
      system: 'GET /api/system/info (authenticated)',
      health: 'GET /health',
      metrics: 'GET /metrics',
      debug: 'GET /api/debug/cookies'
    },
    monitoring: {
      prometheus: '/metrics endpoint available',
      health: 'Comprehensive health checks',
      metrics: 'Custom business metrics tracking'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`🔥 [${req.requestId || 'NO_ID'}] Global error:`, err.stack);
  
  // Regjistro error metrikë
  userLoginsCounter.labels('unknown', 'error').inc();
  
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
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
      console.log(`
==============================================
🚀 USER SERVICE STARTED SUCCESSFULLY
==============================================
📍 Port: ${PORT}
📍 Health: http://localhost:${PORT}/health
📊 Metrics: http://localhost:${PORT}/metrics
🔐 Auth: http://localhost:${PORT}/api/auth/
👑 Admin: http://localhost:${PORT}/api/admin/users
🍪 Debug: http://localhost:${PORT}/api/debug/cookies
📈 Monitoring: Prometheus + Grafana integrated
💾 Cache: ${cacheManager.isRedisAvailable() ? 'Redis' : 'Memory'}
==============================================
`);
      
      // Print metrics info
      console.log('\n📊 Custom Metrics Available:');
      console.log('  - user_registrations_total');
      console.log('  - user_logins_total');
      console.log('  - active_sessions');
      console.log('  - http_request_duration_seconds');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

module.exports = app; // Për testing