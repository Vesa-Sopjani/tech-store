// backend/services/order-service/src/index.js
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const { Kafka } = require('kafkajs');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Database connection
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432
});

// Redis client
const redisClient = redis.createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// Kafka producer
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    
    // Check Redis
    await redisClient.ping();
    
    // Check Kafka
    await producer.connect();
    await producer.disconnect();
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'order-service'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Create order endpoint
app.post('/orders', async (req, res) => {
  const { userId, items, shippingAddress } = req.body;
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Calculate total
    let total = 0;
    for (const item of items) {
      const productResult = await pool.query(
        'SELECT price, stock FROM products WHERE id = $1',
        [item.productId]
      );
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }
      
      const product = productResult.rows[0];
      total += product.price * item.quantity;
      
      // Update stock
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      
      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }
    
    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, total, shippingAddress]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items
    for (const item of items) {
      const productResult = await pool.query(
        'SELECT price FROM products WHERE id = $1',
        [item.productId]
      );
      
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.quantity, productResult.rows[0].price]
      );
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    // Cache the order
    await redisClient.setEx(
      `order:${order.id}`,
      3600, // 1 hour TTL
      JSON.stringify(order)
    );
    
    // Send Kafka event
    await producer.connect();
    await producer.send({
      topic: 'order-created',
      messages: [
        {
          value: JSON.stringify({
            eventType: 'ORDER_CREATED',
            orderId: order.id,
            userId: userId,
            totalAmount: total,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    await producer.disconnect();
    
    logger.info(`Order ${order.id} created successfully`);
    
    res.status(201).json({
      success: true,
      data: order
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get order by ID with cache
app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check cache first
    const cachedOrder = await redisClient.get(`order:${id}`);
    if (cachedOrder) {
      logger.info(`Cache hit for order ${id}`);
      return res.json({
        success: true,
        fromCache: true,
        data: JSON.parse(cachedOrder)
      });
    }
    
    // Get from database
    const orderResult = await pool.query(
      `SELECT o.*, 
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'productId', oi.product_id,
                  'quantity', oi.quantity,
                  'unitPrice', oi.unit_price,
                  'productName', p.name
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const order = orderResult.rows[0];
    
    // Cache the order
    await redisClient.setEx(
      `order:${id}`,
      3600,
      JSON.stringify(order)
    );
    
    res.json({
      success: true,
      fromCache: false,
      data: order
    });
    
  } catch (error) {
    logger.error(`Error fetching order ${id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize connections
async function initialize() {
  try {
    await redisClient.connect();
    await pool.connect();
    
    app.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
    });
    
  } catch (error) {
    logger.error('Failed to initialize service:', error);
    process.exit(1);
  }
}

initialize();

module.exports = app;