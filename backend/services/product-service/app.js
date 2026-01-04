const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. CORS - lejo të gjitha origins për dev
app.use(cors());
app.use(express.json());

// 2. Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB'
};

// 3. Krijo pool
const pool = mysql.createPool(dbConfig);

// 4. ROUTE: Merr të gjitha produktet
app.get('/api/products', async (req, res) => {
  console.log('📦 API /api/products u thirr');
  
  let connection;
  try {
    // Merr lidhje me databazën
    connection = await pool.getConnection();
    console.log('✅ U lidh me databazën');
    
    // Query shumë e thjeshtë
    const [products] = await connection.execute(`
      SELECT 
        id,
        name,
        description,
        price,
        category_id,
        stock_quantity,
        image_url,
        specifications
      FROM Products 
      ORDER BY id
    `);
    
    console.log(`✅ Gjeta ${products.length} produkte`);
    
    // Merr emrat e kategorive
    const [categories] = await connection.execute('SELECT id, name FROM Categories');
    
    // Krijo map për kategoritë
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });
    
    // Shto emrin e kategorisë në çdo produkt
    const processedProducts = products.map(product => ({
      ...product,
      category_name: categoryMap[product.category_id] || 'Uncategorized'
    }));
    
    // Kthe produktet si JSON
    res.json({
      success: true,
      data: processedProducts,
      total: processedProducts.length
    });
    
  } catch (error) {
    console.error('❌ Gabim në databazë:', error);
    
    // Kthe error mesazh
    res.status(500).json({
      success: false,
      message: 'Gabim në server',
      error: error.message
    });
    
  } finally {
    // Lësho lidhjen
    if (connection) {
      connection.release();
      console.log('✅ Lëshova lidhjen me databazën');
    }
  }
});
// 5. ROUTE: Krijo produkt të ri
app.post('/api/products', async (req, res) => {
  console.log('➕ POST /api/products - Krijo produkt të ri');
  
  let connection;
  try {
    const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
    
    console.log('Të dhënat e marra:', req.body);
    
    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO Products (name, description, price, category_id, stock_quantity, image_url, specifications)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, stock_quantity, image_url, JSON.stringify(specifications || {})]
    );
    
    // Merr produktin e sapo krijuar
    const [rows] = await connection.execute('SELECT * FROM Products WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Produkti u krijua me sukses'
    });
    
  } catch (error) {
    console.error('❌ Gabim në krijimin e produktit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në krijimin e produktit',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 6. ROUTE: Përditëso produkt
app.put('/api/products/:id', async (req, res) => {
  console.log(`✏️ PUT /api/products/${req.params.id} - Përditëso produkt`);
  
  let connection;
  try {
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
    
    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `UPDATE Products 
       SET name = ?, description = ?, price = ?, category_id = ?, 
           stock_quantity = ?, image_url = ?, specifications = ?
       WHERE id = ?`,
      [name, description, price, category_id, stock_quantity, image_url, 
       JSON.stringify(specifications || {}), id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkti nuk u gjet'
      });
    }
    
    // Merr produktin e përditësuar
    const [rows] = await connection.execute('SELECT * FROM Products WHERE id = ?', [id]);
    
    res.json({
      success: true,
      data: rows[0],
      message: 'Produkti u përditësua me sukses'
    });
    
  } catch (error) {
    console.error('❌ Gabim në përditësimin e produktit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në përditësimin e produktit',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 7. ROUTE: Fshi produkt
app.delete('/api/products/:id', async (req, res) => {
  console.log(`🗑️ DELETE /api/products/${req.params.id} - Fshi produkt`);
  
  let connection;
  try {
    const { id } = req.params;
    
    connection = await pool.getConnection();
    
    // Së pari merr emrin e produktit për mesazhin
    const [productRows] = await connection.execute('SELECT name FROM Products WHERE id = ?', [id]);
    
    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkti nuk u gjet'
      });
    }
    
    const productName = productRows[0].name;
    
    // Fshi produktin
    const [result] = await connection.execute('DELETE FROM Products WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: `Produkti "${productName}" u fshi me sukses`
    });
    
  } catch (error) {
    console.error('❌ Gabim në fshirjen e produktit:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në fshirjen e produktit',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 8. ROUTE: Merr kategoritë
app.get('/api/categories', async (req, res) => {
  console.log('📂 GET /api/categories');
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [categories] = await connection.execute('SELECT * FROM Categories ORDER BY name');
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('❌ Gabim në marrjen e kategorive:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim në marrjen e kategorive'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 5. ROUTE: Test database connection
app.get('/api/test', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute('SELECT 1 as test');
    res.json({ 
      success: true, 
      message: 'Database connected!',
      test: result[0].test 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database error',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// 6. ROUTE: Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP',
    service: 'product-service-simple',
    timestamp: new Date().toISOString()
  });
});

// 7. ROUTE: Home
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product Service API - Version SIMPLE',
    endpoints: {
      products: 'GET /api/products',
      test: 'GET /api/test',
      health: 'GET /health'
    }
  });
});

// 8. Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Product Service running SIMPLE version on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/products`);
});