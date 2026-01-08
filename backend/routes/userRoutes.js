const express = require('express');
const router = express.Router();

// GET /api/users
router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
  ]);
});

module.exports = router;