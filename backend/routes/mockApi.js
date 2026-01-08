// backend/routes/mockApi.js
const express = require('express');
const router = express.Router();

// ======================
// CATEGORIES MOCK DATA
// ======================
const mockCategories = [
  { id: 1, name: 'Electronics', description: 'Electronic devices', is_active: true, created_at: new Date(), product_count: 45 },
  { id: 2, name: 'Computers', description: 'Computers and accessories', is_active: true, created_at: new Date(), product_count: 32 },
  { id: 3, name: 'Mobile Phones', description: 'Smartphones and tablets', is_active: true, created_at: new Date(), product_count: 67 },
  { id: 4, name: 'Accessories', description: 'Accessories for devices', is_active: true, created_at: new Date(), product_count: 28 },
  { id: 5, name: 'Audio', description: 'Audio equipment', is_active: true, created_at: new Date(), product_count: 39 },
  { id: 6, name: 'Gaming', description: 'Gaming equipment', is_active: false, created_at: new Date(), product_count: 0 },
];

// Categories endpoints
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: mockCategories
  });
});

router.post('/categories', (req, res) => {
  const newCategory = {
    id: mockCategories.length + 1,
    ...req.body,
    created_at: new Date()
  };
  mockCategories.push(newCategory);
  res.json({ success: true, data: newCategory });
});

router.put('/categories/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockCategories.findIndex(c => c.id === id);
  if (index !== -1) {
    mockCategories[index] = { ...mockCategories[index], ...req.body };
    res.json({ success: true, data: mockCategories[index] });
  } else {
    res.status(404).json({ success: false, message: 'Category not found' });
  }
});

router.delete('/categories/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockCategories.findIndex(c => c.id === id);
  if (index !== -1) {
    mockCategories[index].is_active = false;
    res.json({ success: true, message: 'Category deactivated' });
  } else {
    res.status(404).json({ success: false, message: 'Category not found' });
  }
});

// ======================
// ORDERS MOCK DATA
// ======================
const mockOrders = [
  {
    id: 1,
    order_number: 'ORD-001',
    user_id: 1,
    user: {
      id: 1,
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    },
    total_amount: 129.99,
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'credit_card',
    shipping_address: '123 Main St, New York, NY',
    items: [
      { product_name: 'Laptop', quantity: 1, unit_price: 999.99, total_price: 999.99 },
      { product_name: 'Mouse', quantity: 1, unit_price: 29.99, total_price: 29.99 }
    ],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    order_number: 'ORD-002',
    user_id: 2,
    user: {
      id: 2,
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321'
    },
    total_amount: 299.99,
    status: 'processing',
    payment_status: 'pending',
    payment_method: 'paypal',
    shipping_address: '456 Oak Ave, Los Angeles, CA',
    items: [
      { product_name: 'Smartphone', quantity: 1, unit_price: 699.99, total_price: 699.99 },
      { product_name: 'Headphones', quantity: 1, unit_price: 199.99, total_price: 199.99 }
    ],
    created_at: new Date(Date.now() - 86400000),
    updated_at: new Date(Date.now() - 86400000)
  }
];

// Orders endpoints
router.get('/orders', (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
  
  let filteredOrders = [...mockOrders];
  
  if (status && status !== 'all') {
    filteredOrders = filteredOrders.filter(o => o.status === status);
  }
  
  if (paymentStatus && paymentStatus !== 'all') {
    filteredOrders = filteredOrders.filter(o => o.payment_status === paymentStatus);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredOrders = filteredOrders.filter(o => 
      o.order_number.toLowerCase().includes(searchLower) ||
      o.user.full_name.toLowerCase().includes(searchLower) ||
      o.user.email.toLowerCase().includes(searchLower) ||
      o.shipping_address.toLowerCase().includes(searchLower)
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredOrders.length,
      pages: Math.ceil(filteredOrders.length / limit)
    }
  });
});

router.get('/orders/stats', (req, res) => {
  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter(o => o.status === 'pending').length;
  const completedOrders = mockOrders.filter(o => o.status === 'completed').length;
  const today = new Date().toDateString();
  const todayOrders = mockOrders.filter(o => 
    new Date(o.created_at).toDateString() === today
  ).length;
  
  const totalRevenue = mockOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, order) => sum + order.total_amount, 0);
  
  res.json({
    success: true,
    data: {
      summary: {
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        today_orders: todayOrders,
        total_revenue: totalRevenue
      }
    }
  });
});

router.get('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const order = mockOrders.find(o => o.id === id);
  if (order) {
    res.json({ success: true, data: order });
  } else {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

router.put('/orders/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const order = mockOrders.find(o => o.id === id);
  if (order) {
    order.status = status;
    order.updated_at = new Date();
    res.json({ success: true, data: order });
  } else {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

router.put('/orders/:id/payment', (req, res) => {
  const id = parseInt(req.params.id);
  const { payment_status } = req.body;
  const order = mockOrders.find(o => o.id === id);
  if (order) {
    order.payment_status = payment_status;
    order.updated_at = new Date();
    res.json({ success: true, data: order });
  } else {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

router.delete('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockOrders.findIndex(o => o.id === id);
  if (index !== -1) {
    mockOrders.splice(index, 1);
    res.json({ success: true, message: 'Order deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

// ======================
// USERS MOCK DATA
// ======================
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin',
    email_verified: true,
    is_deleted: false,
    locked_until: null,
    last_login: new Date(),
    created_at: new Date(Date.now() - 30 * 86400000),
    address: '789 Admin St, Admin City',
    phone: '+1234567890'
  },
  {
    id: 2,
    username: 'customer1',
    email: 'customer1@example.com',
    full_name: 'John Customer',
    role: 'customer',
    email_verified: true,
    is_deleted: false,
    locked_until: null,
    last_login: new Date(Date.now() - 86400000),
    created_at: new Date(Date.now() - 15 * 86400000),
    address: '456 Customer Ave, Customer City',
    phone: '+0987654321'
  },
  {
    id: 3,
    username: 'moderator',
    email: 'moderator@example.com',
    full_name: 'Moderator User',
    role: 'moderator',
    email_verified: true,
    is_deleted: false,
    locked_until: null,
    last_login: new Date(Date.now() - 2 * 86400000),
    created_at: new Date(Date.now() - 7 * 86400000),
    address: '321 Moderator Rd, Moderator Town',
    phone: '+1122334455'
  }
];

// Admin users endpoints
router.get('/admin/users', (req, res) => {
  const { page = 1, limit = 20, search = '', role = '', sortBy = 'created_at', sortOrder = 'DESC', showDeleted = 'false' } = req.query;
  
  let filteredUsers = [...mockUsers];
  
  // Search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filteredUsers = filteredUsers.filter(user =>
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchLower))
    );
  }
  
  // Role filter
  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }
  
  // Deleted filter
  if (showDeleted === 'false') {
    filteredUsers = filteredUsers.filter(user => !user.is_deleted);
  }
  
  // Sort
  filteredUsers.sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    if (sortOrder === 'ASC') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      users: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
        hasNextPage: endIndex < filteredUsers.length,
        hasPrevPage: startIndex > 0
      }
    }
  });
});

router.get('/admin/users/statistics/overview', (req, res) => {
  const totalUsers = mockUsers.length;
  const activeLast7Days = mockUsers.filter(u => 
    new Date(u.last_login) > new Date(Date.now() - 7 * 86400000)
  ).length;
  
  const roleStats = [
    { role: 'admin', count: mockUsers.filter(u => u.role === 'admin').length, verified_count: 1, locked_count: 0 },
    { role: 'moderator', count: mockUsers.filter(u => u.role === 'moderator').length, verified_count: 1, locked_count: 0 },
    { role: 'customer', count: mockUsers.filter(u => u.role === 'customer').length, verified_count: 1, locked_count: 0 }
  ];
  
  res.json({
    success: true,
    data: {
      roleStats,
      totalStats: {
        total_users: totalUsers,
        active_last_7_days: activeLast7Days,
        today_registrations: 1
      },
      trends: []
    }
  });
});

router.post('/admin/users', (req, res) => {
  const newUser = {
    id: mockUsers.length + 1,
    ...req.body,
    email_verified: false,
    is_deleted: false,
    locked_until: null,
    last_login: null,
    created_at: new Date()
  };
  mockUsers.push(newUser);
  res.json({ success: true, data: newUser });
});

router.put('/admin/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    mockUsers[index] = { ...mockUsers[index], ...req.body };
    res.json({ success: true, data: mockUsers[index] });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.delete('/admin/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    if (req.query.permanent === 'true') {
      mockUsers.splice(index, 1);
      res.json({ success: true, message: 'User permanently deleted' });
    } else {
      mockUsers[index].is_deleted = true;
      res.json({ success: true, message: 'User deleted' });
    }
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.post('/admin/users/:id/restore', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    mockUsers[index].is_deleted = false;
    res.json({ success: true, data: mockUsers[index] });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.post('/admin/users/:id/lock', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    mockUsers[index].locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
    res.json({ success: true, data: mockUsers[index] });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.post('/admin/users/:id/unlock', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    mockUsers[index].locked_until = null;
    res.json({ success: true, data: mockUsers[index] });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.post('/admin/users/:id/role', (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    mockUsers[index].role = role;
    res.json({ success: true, data: mockUsers[index] });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

router.post('/admin/users/:id/reset-password', (req, res) => {
  const id = parseInt(req.params.id);
  const index = mockUsers.findIndex(u => u.id === id);
  if (index !== -1) {
    res.json({ success: true, message: 'Password reset successfully' });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

module.exports = router;