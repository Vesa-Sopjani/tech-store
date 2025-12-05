// backend/services/api-gateway/src/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Service routes
const services = {
  '/api/orders': 'http://order-service:3001',
  '/api/products': 'http://product-service:3002',
  '/api/users': 'http://user-service:3003',
  '/api/analytics': 'http://analytics-service:3004',
  '/api/notifications': 'http://notification-service:3005'
};

// Setup proxies
Object.entries(services).forEach(([route, target]) => {
  app.use(route, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: ''
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${route}:`, err);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'The service is currently unavailable. Please try again later.'
      });
    }
  }));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
  });
});

// Frontend static files (in production)
app.use(express.static('../frontend/dist'));

// Fallback for SPA routing
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile('index.html', { root: '../frontend/dist' });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Available routes:');
  Object.keys(services).forEach(route => {
    console.log(`  ${route} -> ${services[route]}`);
  });
});