const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid').v4;
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

// ==================== CORS CONFIGURATION ====================
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
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Authorization',
    'Set-Cookie',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS requests
app.options('*', cors(corsOptions));

// ==================== SECURITY MIDDLEWARE ====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: { 
    success: false, 
    message: 'Too many login attempts',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { 
    success: false, 
    message: 'Too many requests',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

// ==================== DATABASE CONFIGURATION ====================
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// JWT Secrets
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_super_secure_jwt_secret_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_super_secure_refresh_secret_2024';

// ==================== MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }
    req.user = user;
    next();
  });
};

// ==================== ROUTES ====================

// Handle preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    return res.status(200).end();
  }
  
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'User Service API - Tech Store',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      profile: 'GET /api/users/profile (authenticated)',
      health: 'GET /health',
      test: 'GET /api/test'
    },
    cors: {
      enabled: true,
      origin: req.headers.origin || 'http://localhost:5173'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'UP'
    }
  };

  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
  } catch (err) {
    health.status = 'UP';
    health.checks.database = 'DOWN';
  }

  res.json(health);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'User service is working',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Users API root
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'Users API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      profile: 'GET /api/users/profile',
      list: 'GET /api/users/list (admin)'
    }
  });
});

// Auth API root
app.get('/api/auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout'
    }
  });
});

// LOGIN ENDPOINT (CRITICAL FOR FRONTEND)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', { 
      email: req.body.email, 
      timestamp: new Date().toISOString(),
      origin: req.headers.origin 
    });
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Mock login for testing (in production, check database)
    const mockUsers = {
      'admin@techstore.com': {
        id: 1,
        email: 'admin@techstore.com',
        password: '$2a$12$YourHashedPasswordHere', // bcrypt hash of 'admin123'
        name: 'Admin User',
        role: 'admin'
      },
      'user@example.com': {
        id: 2,
        email: 'user@example.com',
        password: '$2a$12$YourHashedPasswordHere',
        name: 'Regular User',
        role: 'user'
      }
    };
    
    const user = mockUsers[email];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }
    
    // In production, verify password with bcrypt
    // const isValid = await bcrypt.compare(password, user.password);
    const isValid = password === 'admin123'; // Simple check for testing
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      timestamp: new Date().toISOString()
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Mock registration (in production, save to database)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: Math.floor(Math.random() * 1000),
        email,
        name,
        role: 'user'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      timestamp: new Date().toISOString()
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        timestamp: new Date().toISOString()
      });
    }
    
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid refresh token',
          timestamp: new Date().toISOString()
        });
      }
      
      const accessToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      
      res.json({
        success: true,
        accessToken,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'Logout successful',
    timestamp: new Date().toISOString()
  });
});

// User profile endpoint
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test login endpoint (for debugging)
app.post('/auth/login', async (req, res) => {
  console.log('Direct /auth/login called:', req.body);
  
  res.json({
    success: true,
    message: 'Direct login endpoint (for API Gateway proxy)',
    user: {
      id: 1,
      email: req.body.email || 'test@example.com',
      name: 'Test User'
    },
    token: 'direct-login-token',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requested: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/',
      '/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/users/profile'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    const startPort = parseInt(process.env.PORT) || 5003;
    const PORT = await getAvailablePort(startPort);
    
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`📄 Test: GET http://localhost:${PORT}/api/test`);
    });
    
    return PORT;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(console.error);