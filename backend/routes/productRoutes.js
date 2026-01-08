const express = require('express');
const router = express.Router();

// GET /api/products
router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 10 },
    { id: 2, name: 'Smartphone', price: 699.99, category: 'Mobile', stock: 25 },
    { id: 3, name: 'Headphones', price: 199.99, category: 'Audio', stock: 50 }
  ]);
});

// POST /api/products
router.post('/', (req, res) => {
  res.json({ message: 'Product created' });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  res.json({ 
    id: req.params.id, 
    name: 'Sample Product', 
    price: 99.99, 
    category: 'Electronics' 
  });
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  res.json({ message: 'Product updated' });
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  res.json({ message: 'Product deleted' });
});

module.exports = router;