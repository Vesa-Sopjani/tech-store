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
    message: 'Too many notification requests'
  }
});
app.use(limiter);

// ==================== NOTIFICATION STORAGE ====================
class NotificationStore {
  constructor() {
    this.notifications = new Map(); // userId -> notifications array
  }

  add(userId, notification) {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId).unshift({
      id: Date.now().toString(),
      ...notification,
      createdAt: new Date().toISOString(),
      read: false
    });

    // Keep only last 50 notifications per user
    if (this.notifications.get(userId).length > 50) {
      this.notifications.set(userId, this.notifications.get(userId).slice(0, 50));
    }
  }

  get(userId, limit = 20) {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.slice(0, limit);
  }

  markAsRead(userId, notificationId) {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    }
  }

  getUnreadCount(userId) {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }
}

const notificationStore = new NotificationStore();

// ==================== NOTIFICATION HANDLERS ====================
class NotificationHandler {
  static handleUserRegistered(event) {
    const { user } = event.payload;
    
    notificationStore.add(user.id, {
      type: 'welcome',
      title: 'Welcome to Tech Store!',
      message: `Hello ${user.username}, welcome to our store! Start exploring our products.`,
      priority: 'low'
    });

    console.log(`📧 Welcome notification sent to ${user.username}`);
  }

  static handleOrderCreated(event) {
    const { order } = event.payload;
    
    notificationStore.add(order.user_id, {
      type: 'order_created',
      title: 'Order Confirmed',
      message: `Your order #${order.id} has been confirmed. Total: $${order.total_amount}`,
      priority: 'medium',
      orderId: order.id
    });

    console.log(`📦 Order notification sent for order #${order.id}`);
  }

  static handleOrderStatusChanged(event) {
    const { orderId, oldStatus, newStatus, userId } = event.payload;
    
    notificationStore.add(userId, {
      type: 'order_status',
      title: 'Order Status Updated',
      message: `Order #${orderId} status changed from ${oldStatus} to ${newStatus}`,
      priority: 'medium',
      orderId: orderId
    });

    console.log(`🔄 Order status notification sent for order #${orderId}`);
  }

  static handleProductStockUpdated(event) {
    const { productId, productName, oldStock, newStock } = event.payload;
    
    if (newStock === 0) {
      // Notify admins about out of stock
      // This would typically be sent to admin users
      console.log(`⚠️ Product ${productName} is out of stock`);
    } else if (newStock < 10) {
      // Notify admins about low stock
      console.log(`📉 Product ${productName} is low on stock: ${newStock} remaining`);
    }
  }
}

// ==================== KAFKA CONSUMER SETUP ====================
const notificationConsumer = new KafkaConsumer('notification-service');

// Subscribe to relevant events
const setupEventHandlers = async () => {
  await notificationConsumer.subscribe(EventTypes.USER_REGISTERED, (event) => {
    NotificationHandler.handleUserRegistered(event);
  });

  await notificationConsumer.subscribe(EventTypes.ORDER_CREATED, (event) => {
    NotificationHandler.handleOrderCreated(event);
  });

  await notificationConsumer.subscribe(EventTypes.ORDER_STATUS_CHANGED, (event) => {
    NotificationHandler.handleOrderStatusChanged(event);
  });

  await notificationConsumer.subscribe(EventTypes.PRODUCT_STOCK_UPDATED, (event) => {
    NotificationHandler.handleProductStockUpdated(event);
  });

  await notificationConsumer.run();
  console.log('✅ Notification event handlers registered');
};

// ==================== API ROUTES ====================

// Get user notifications
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  const notifications = notificationStore.get(userId, parseInt(limit));
  const unreadCount = notificationStore.getUnreadCount(userId);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      total: notifications.length
    }
  });
});

// Mark notification as read
app.put('/api/notifications/:userId/read/:notificationId', (req, res) => {
  const { userId, notificationId } = req.params;
  
  notificationStore.markAsRead(userId, notificationId);
  
  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Mark all notifications as read
app.put('/api/notifications/:userId/read-all', (req, res) => {
  const { userId } = req.params;
  const notifications = notificationStore.get(userId);
  
  notifications.forEach(notification => {
    notificationStore.markAsRead(userId, notification.id);
  });
  
  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Get unread count
app.get('/api/notifications/:userId/unread-count', (req, res) => {
  const { userId } = req.params;
  const unreadCount = notificationStore.getUnreadCount(userId);
  
  res.json({
    success: true,
    data: { unreadCount }
  });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    kafka: notificationConsumer.isConnected ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// ==================== METRICS ====================
app.get('/metrics', (req, res) => {
  const metrics = {
    notification_service_requests_total: 0,
    notification_service_notifications_sent: 0,
    notification_service_errors_total: 0,
    notification_service_kafka_connected: notificationConsumer.isConnected ? 1 : 0
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
  console.error('Notification service error:', err);
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
    const startPort = parseInt(process.env.PORT) || 5005;
    const PORT = await getAvailablePort(startPort);
    
    // Start Kafka consumer
    await setupEventHandlers();
    
    app.listen(PORT, () => {
      console.log(`🚀 Notification Service running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log('📨 Listening for events...');
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down notification service...');
  await notificationConsumer.disconnect();
  process.exit(0);
});

startServer();