const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const net = require('net');
const KafkaConsumer = require('../shared/events/kafka-consumer');
const EventTypes = require('../shared/events/event-types');
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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many analytics requests'
  }
});
app.use(limiter);

// ==================== ANALYTICS STORAGE ====================
class AnalyticsStore {
  constructor() {
    this.metrics = {
      userRegistrations: [],
      orders: [],
      revenue: [],
      productViews: [],
      popularProducts: new Map()
    };
    
    this.dailyStats = new Map();
    this.hourlyStats = new Map();
  }

  recordUserRegistration(user) {
    const date = new Date().toISOString().split('T')[0];
    this.incrementDailyStat(date, 'registrations');
    
    this.metrics.userRegistrations.push({
      userId: user.id,
      timestamp: new Date().toISOString(),
      username: user.username
    });
  }

  recordOrder(order) {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    this.incrementDailyStat(date, 'orders');
    this.incrementDailyStat(date, 'revenue', order.total_amount);
    this.incrementHourlyStat(date, hour, 'orders');
    this.incrementHourlyStat(date, hour, 'revenue', order.total_amount);

    this.metrics.orders.push({
      orderId: order.id,
      userId: order.user_id,
      timestamp: new Date().toISOString(),
      amount: order.total_amount,
      status: order.status
    });

    // Record product sales
    if (order.items) {
      order.items.forEach(item => {
        const current = this.metrics.popularProducts.get(item.product_id) || {
          productId: item.product_id,
          productName: item.product_name,
          totalSold: 0,
          totalRevenue: 0
        };
        
        current.totalSold += item.quantity;
        current.totalRevenue += item.total_price;
        this.metrics.popularProducts.set(item.product_id, current);
      });
    }
  }

  recordProductView(productId) {
    this.metrics.productViews.push({
      productId,
      timestamp: new Date().toISOString()
    });
  }

  incrementDailyStat(date, metric, value = 1) {
    const key = `${date}-${metric}`;
    const current = this.dailyStats.get(key) || 0;
    this.dailyStats.set(key, current + value);
  }

  incrementHourlyStat(date, hour, metric, value = 1) {
    const key = `${date}-${hour}-${metric}`;
    const current = this.hourlyStats.get(key) || 0;
    this.hourlyStats.set(key, current + value);
  }

  getDailyStats(date) {
    const orders = this.dailyStats.get(`${date}-orders`) || 0;
    const revenue = this.dailyStats.get(`${date}-revenue`) || 0;
    const registrations = this.dailyStats.get(`${date}-registrations`) || 0;

    return { orders, revenue, registrations };
  }

  getPopularProducts(limit = 10) {
    return Array.from(this.metrics.popularProducts.values())
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);
  }

  getRevenueTrend(days = 7) {
    const trends = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const stats = this.getDailyStats(dateStr);
      trends.push({
        date: dateStr,
        revenue: stats.revenue,
        orders: stats.orders
      });
    }
    
    return trends;
  }
}

const analyticsStore = new AnalyticsStore();

// ==================== KAFKA CONSUMER SETUP ====================
const analyticsConsumer = new KafkaConsumer('analytics-service');

// Subscribe to relevant events
const setupEventHandlers = async () => {
  await analyticsConsumer.subscribe(EventTypes.USER_REGISTERED, (event) => {
    analyticsStore.recordUserRegistration(event.payload.user);
  });

  await analyticsConsumer.subscribe(EventTypes.ORDER_CREATED, (event) => {
    analyticsStore.recordOrder(event.payload.order);
  });

  await analyticsConsumer.subscribe(EventTypes.ORDER_STATUS_CHANGED, (event) => {
    if (event.payload.newStatus === 'completed') {
      // Update analytics for completed orders
      console.log(`✅ Order completed: ${event.payload.orderId}`);
    }
  });

  await analyticsConsumer.subscribe(EventTypes.PRODUCT_VIEWED, (event) => {
    analyticsStore.recordProductView(event.payload.productId);
  });

  await analyticsConsumer.run();
  console.log('✅ Analytics event handlers registered');
};

// ==================== API ROUTES ====================

// Get overall analytics
app.get('/api/analytics/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const todayStats = analyticsStore.getDailyStats(today);
  const yesterdayStats = analyticsStore.getDailyStats(yesterday);
  
  const revenueGrowth = yesterdayStats.revenue > 0 
    ? ((todayStats.revenue - yesterdayStats.revenue) / yesterdayStats.revenue * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      today: todayStats,
      yesterday: yesterdayStats,
      growth: {
        revenue: parseFloat(revenueGrowth),
        orders: yesterdayStats.orders > 0 
          ? ((todayStats.orders - yesterdayStats.orders) / yesterdayStats.orders * 100).toFixed(2)
          : 0
      },
      popularProducts: analyticsStore.getPopularProducts(5)
    }
  });
});

// Get revenue trends
app.get('/api/analytics/revenue-trend', (req, res) => {
  const { days = 7 } = req.query;
  const trends = analyticsStore.getRevenueTrend(parseInt(days));
  
  res.json({
    success: true,
    data: trends
  });
});

// Get popular products
app.get('/api/analytics/popular-products', (req, res) => {
  const { limit = 10 } = req.query;
  const products = analyticsStore.getPopularProducts(parseInt(limit));
  
  res.json({
    success: true,
    data: products
  });
});

// Get user registration trends
app.get('/api/analytics/user-registrations', (req, res) => {
  const { days = 30 } = req.query;
  const registrations = analyticsStore.metrics.userRegistrations
    .filter(reg => {
      const regDate = new Date(reg.timestamp);
      const cutoffDate = new Date(Date.now() - parseInt(days) * 86400000);
      return regDate >= cutoffDate;
    })
    .map(reg => ({
      date: reg.timestamp.split('T')[0],
      username: reg.username
    }));
  
  res.json({
    success: true,
    data: registrations
  });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    kafka: analyticsConsumer.isConnected ? 'CONNECTED' : 'DISCONNECTED',
    metrics: {
      totalOrders: analyticsStore.metrics.orders.length,
      totalUsers: analyticsStore.metrics.userRegistrations.length,
      totalProductViews: analyticsStore.metrics.productViews.length
    }
  });
});

// ==================== METRICS ====================
app.get('/metrics', (req, res) => {
  const metrics = {
    analytics_service_requests_total: 0,
    analytics_service_events_processed: analyticsStore.metrics.orders.length + analyticsStore.metrics.userRegistrations.length,
    analytics_service_errors_total: 0,
    analytics_service_kafka_connected: analyticsConsumer.isConnected ? 1 : 0
  };

  res.set('Content-Type', 'text/plain');
  let output = '';
  for (const [key, value] of Object.entries(metrics)) {
    output += `${key} ${value}\n`;
  }
  res.send(output);
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Analytics service error:', err);
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
    const startPort = parseInt(process.env.PORT) || 5006;
    const PORT = await getAvailablePort(startPort);
    
    // Start Kafka consumer
    await setupEventHandlers();
    
    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log('📈 Tracking analytics events...');
    });
  } catch (error) {
    console.error('Failed to start analytics service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down analytics service...');
  await analyticsConsumer.disconnect();
  process.exit(0);
});

startServer();