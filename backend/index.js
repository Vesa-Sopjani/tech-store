// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes (sigurohu që këto file ekzistojnë)
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const mockApiRoutes = require('./routes/mockApi');

// Import middleware (nëse ekzistojnë, ose komentohen)
const { errorHandler } = require('./middlewares/errorHandler');
// const { rateLimiter } = require('./middleware/rateLimiter');

// Initialize app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting (nëse e ke të përkufizuar)
// app.use('/api/auth', rateLimiter);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Add missing endpoints that your frontend is requesting
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/debug/cookies', (req, res) => {
  res.json({ 
    cookies: req.cookies || {},
    message: 'Make sure cookie-parser middleware is installed'
  });
});
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'x-client-origin'  // <-- ADD THIS LINE
  ]
}));
app.use('/api', mockApiRoutes);

// Prevent favicon 404
app.get('/favicon.ico', (req, res) => res.status(204).end());
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler i përditësuar (nuk prodhon PathError)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin API available at http://localhost:${PORT}/api/admin`);
});

module.exports = { app, io };
