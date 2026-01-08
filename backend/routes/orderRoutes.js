const express = require('express');
const router = express.Router();

// GET /api/orders
router.get('/', (req, res) => {
  res.json([
    { 
      id: 1, 
      orderNumber: 'ORD-001', 
      customer: 'John Doe', 
      total: 1299.98, 
      status: 'completed',
      date: new Date().toISOString()
    }
  ]);
});

// POST /api/orders
router.post('/', (req, res) => {
  res.json({ 
    message: 'Order created', 
    orderId: Math.floor(Math.random() * 1000) 
  });
});

module.exports = router;