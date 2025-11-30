const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const net = require('net');
require('dotenv').config();

const app = express();

// ==================== PORT CONFIGURATION ====================
const getAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(startPort));
    });
    server.listen(startPort);
  });
};

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP'
  }
});
app.use(limiter);

// ==================== SERVICE DISCOVERY ====================
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:5003',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:5001',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:5002',
  admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:5004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5006'
};

// ==================== PROXY MIDDLEWARES ====================

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token && req.path.includes('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  next();
};

// User Service
app.use('/api/users', authenticateToken, createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users'
  },
  onError: (err, req, res) => {
    console.error('User Service error:', err);
    res.status(503).json({
      success: false,
      message: 'User service is temporarily unavailable'
    });
  }
}));

// Product Service
app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/api/products'
  },
  onError: (err, req, res) => {
    console.error('Product Service error:', err);
    res.status(503).json({
      success: false,
      message: 'Product service is temporarily unavailable'
    });
  }
}));

// Order Service
app.use('/api/orders', authenticateToken, createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '/api/orders'
  },
  onError: (err, req, res) => {
    console.error('Order Service error:', err);
    res.status(503).json({
      success: false,
      message: 'Order service is temporarily unavailable'
    });
  }
}));

// Admin Service
app.use('/api/admin', authenticateToken, createProxyMiddleware({
  target: services.admin,
  changeOrigin: true,
  pathRewrite: {
    '^/api/admin': '/api/admin'
  },
  onError: (err, req, res) => {
    console.error('Admin Service error:', err);
    res.status(503).json({
      success: false,
      message: 'Admin service is temporarily unavailable'
    });
  }
}));

// Auth endpoints (no authentication required)
app.use('/api/auth', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  }
}));

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check all services health
  for (const [serviceName, url] of Object.entries(services)) {
    try {
      const response = await fetch(`${url}/health`);
      health.services[serviceName] = response.status === 200 ? 'UP' : 'DOWN';
    } catch (error) {
      health.services[serviceName] = 'DOWN';
    }
  }

  // If any service is down, mark gateway as degraded
  if (Object.values(health.services).some(status => status === 'DOWN')) {
    health.status = 'DEGRADED';
  }

  res.json(health);
});

// ==================== METRICS ====================
app.get('/metrics', (req, res) => {
  const metrics = {
    api_gateway_requests_total: 0,
    api_gateway_errors_total: 0,
    api_gateway_service_status: Object.entries(services).reduce((acc, [key]) => {
      acc[key] = 1; // Assume up for simplicity
      return acc;
    }, {})
  };

  res.set('Content-Type', 'text/plain');
  let output = '';
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        output += `${key}{service="${subKey}"} ${subValue}\n`;
      }
    } else {
      output += `${key} ${value}\n`;
    }
  }
  res.send(output);
});

// ==================== ROOT ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({
    message: 'Tech Store API Gateway',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      admin: '/api/admin',
      health: '/health',
      metrics: '/metrics'
    },
    services
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    const startPort = parseInt(process.env.PORT) || 3000;
    const PORT = await getAvailablePort(startPort);
    
    app.listen(PORT, () => {
      console.log(`🚀 API Gateway running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log('🔀 Routing to services:');
      Object.entries(services).forEach(([name, url]) => {
        console.log(`   ${name.padEnd(12)} → ${url}`);
      });
    });
  } catch (error) {
    console.error('Failed to start gateway:', error);
    process.exit(1);
  }
};

startServer();