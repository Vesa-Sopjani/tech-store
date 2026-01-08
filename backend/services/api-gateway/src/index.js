const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Handle OPTIONS requests (preflight) explicitly
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    return res.status(200).end();
  }
  
  next();
});

// ==================== PROXY CONFIGURATION ====================
const services = {
  '/api/users': 'http://backend-user-service:5003',
  '/api/products': 'http://backend-product-service:5001',
  '/api/orders': 'http://backend-order-service:5002',
  '/api/admin': 'http://backend-admin-service:5004',
  '/api/auth': 'http://backend-user-service:5003/auth'
};

// Setup proxies with proper CORS headers
Object.entries(services).forEach(([route, target]) => {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = path.replace(route, '') || '/';
      console.log(`Proxying: ${req.method} ${path} -> ${target}${newPath}`);
      return newPath;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add CORS headers to proxied requests
      proxyReq.setHeader('Origin', req.headers.origin || 'http://localhost:5173');
    },
    onProxyRes: (proxyRes, req, res) => {
      // Ensure CORS headers are passed through
      proxyRes.headers['access-control-allow-origin'] = req.headers.origin || 'http://localhost:5173';
      proxyRes.headers['access-control-allow-credentials'] = 'true';
      
      // Remove any duplicate CORS headers
      delete proxyRes.headers['access-control-allow-headers'];
      delete proxyRes.headers['access-control-allow-methods'];
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${route}:`, err.message);
      
      // Return CORS-friendly error
      res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: route.replace('/api/', ''),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.use(route, proxy);
});

// ==================== ROUTES ====================

// Health check endpoint
app.get('/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    status: 'healthy',
    gateway: `API Gateway on port ${PORT}`,
    timestamp: new Date().toISOString(),
    services: Object.keys(services).map(route => ({
      route,
      target: services[route],
      status: 'available'
    })),
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});

// Test admin endpoint
app.get('/api/admin/test', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    success: true,
    message: 'Admin API Gateway test endpoint',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    message: 'Tech Store API Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: Object.keys(services),
    services: Object.entries(services).map(([route, target]) => ({
      route,
      target,
      status: 'available'
    })),
    cors: {
      enabled: true,
      origin: req.headers.origin || 'http://localhost:5173'
    }
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    success: true,
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': req.headers.origin,
      'access-control-allow-credentials': 'true'
    }
  });
});

// Login test endpoint (direct)
app.post('/api/auth/login-test', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  console.log('Login test received:', req.body);
  
  res.json({
    success: true,
    message: 'Login test successful',
    token: 'test-jwt-token-12345',
    user: {
      id: 1,
      email: req.body.email || 'test@example.com',
      name: 'Test User',
      role: 'admin'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({
    error: 'API endpoint not found',
    requested: req.originalUrl,
    availableRoutes: Object.keys(services),
    timestamp: new Date().toISOString()
  });
});

// Global error handler with CORS headers
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('📊 Available routes:');
  Object.entries(services).forEach(([route, target]) => {
    console.log(`  ${route} -> ${target}`);
  });
  console.log(`\n✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ CORS test: http://localhost:${PORT}/api/cors-test`);
  console.log(`✅ Login test: POST http://localhost:${PORT}/api/auth/login-test`);
});