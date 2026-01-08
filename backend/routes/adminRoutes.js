const express = require('express');
const router = express.Router();

// Basic admin route
router.get('/', (req, res) => {
  res.json({
    message: 'Admin API is working',
    endpoints: [
      '/api/admin/dashboard/stats',
      '/api/admin/orders/recent',
      '/api/admin/products/top',
      '/api/admin/sales/last-30-days',
      '/api/admin/categories/distribution'
    ]
  });
});

// Mock dashboard stats (since database isn't set up)
router.get('/dashboard/stats', (req, res) => {
  res.json({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    todayOrders: 0,
    todayRevenue: 0
  });
});

// Add other mock endpoints to avoid 404s
router.get('/orders/recent', (req, res) => {
  res.json([]);
});

router.get('/products/top', (req, res) => {
  res.json([]);
});

router.get('/sales/last-30-days', (req, res) => {
  // Generate mock data for 30 days
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      orders: Math.floor(Math.random() * 10),
      revenue: Math.floor(Math.random() * 5000)
    });
  }
  
  res.json(data);
});

router.get('/categories/distribution', (req, res) => {
  res.json([
    { category: 'Electronics', product_count: 45, total_sales: 156 },
    { category: 'Computers', product_count: 32, total_sales: 89 },
    { category: 'Mobile', product_count: 67, total_sales: 234 }
  ]);
});

module.exports = router;