const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Konfigurimi i bazës së të dhënave MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TechProductDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Krijimi i pool connection
const pool = mysql.createPool(dbConfig);

// Testo lidhjen me bazën e të dhënave
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ U lidh në bazën e të dhënave MySQL me sukses!');
        connection.release();
    } catch (err) {
        console.error('❌ Gabim në lidhjen me bazën e të dhënave:', err);
        process.exit(1);
    }
}

testConnection();

// Ruta për produktet
// Merr të gjitha produktet me filtra opsionalë
app.get('/api/products', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { category, search, minPrice, maxPrice } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM Products p 
            LEFT JOIN Categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        
        const params = [];
        
        if (category) {
            query += ` AND c.name = ?`;
            params.push(category);
        }
        
        if (search) {
            query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (minPrice) {
            query += ` AND p.price >= ?`;
            params.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            query += ` AND p.price <= ?`;
            params.push(parseFloat(maxPrice));
        }
        
        query += ` ORDER BY p.created_at DESC`;
        
        const [rows] = await connection.execute(query, params);
        
        res.json({
            success: true,
            data: rows,
            total: rows.length
        });
    } catch (err) {
        console.error('Gabim në marrjen e produkteve:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Merr produkt sipas ID
app.get('/api/products/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = req.params;
        
        const [rows] = await connection.execute(
            `SELECT p.*, c.name as category_name 
             FROM Products p 
             LEFT JOIN Categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produkti nuk u gjet'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        console.error('Gabim në marrjen e produktit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Krijo produkt të ri (admin)
app.post('/api/products', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
        
        const [result] = await connection.execute(
            `INSERT INTO Products (name, description, price, category_id, stock_quantity, image_url, specifications)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, description, price, category_id, stock_quantity, image_url, JSON.stringify(specifications)]
        );
        
        // Merr produktin e sapo krijuar
        const [rows] = await connection.execute(
            'SELECT * FROM Products WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            data: rows[0],
            message: 'Produkti u krijua me sukses'
        });
    } catch (err) {
        console.error('Gabim në krijimin e produktit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Përditëso produkt
app.put('/api/products/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = req.params;
        const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;
        
        const [result] = await connection.execute(
            `UPDATE Products 
             SET name = ?, description = ?, price = ?, category_id = ?, 
                 stock_quantity = ?, image_url = ?, specifications = ?
             WHERE id = ?`,
            [name, description, price, category_id, stock_quantity, image_url, JSON.stringify(specifications), id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produkti nuk u gjet'
            });
        }
        
        // Merr produktin e përditësuar
        const [rows] = await connection.execute(
            'SELECT * FROM Products WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            data: rows[0],
            message: 'Produkti u përditësua me sukses'
        });
    } catch (err) {
        console.error('Gabim në përditësimin e produktit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Fshi produkt
app.delete('/api/products/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = req.params;
        
        const [result] = await connection.execute(
            'DELETE FROM Products WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produkti nuk u gjet'
            });
        }
        
        res.json({
            success: true,
            message: 'Produkti u fshi me sukses'
        });
    } catch (err) {
        console.error('Gabim në fshirjen e produktit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Merr të gjitha kategoritë
app.get('/api/categories', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM Categories ORDER BY name');
        
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Gabim në marrjen e kategorive:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta për health check
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        res.json({ 
            status: 'UP', 
            service: 'product-service',
            database: 'MySQL',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'DOWN', 
            service: 'product-service',
            error: err.message 
        });
    }
});

// Ruta default
app.get('/', (req, res) => {
    res.json({ 
        message: 'Product Service API with MySQL', 
        version: '1.0.0',
        database: 'MySQL',
        endpoints: {
            getProducts: 'GET /api/products',
            getProduct: 'GET /api/products/:id',
            createProduct: 'POST /api/products',
            updateProduct: 'PUT /api/products/:id',
            deleteProduct: 'DELETE /api/products/:id',
            getCategories: 'GET /api/categories'
        }
    });
});

// Menaxhimi i gabimeve
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Diçka shkoi keq!'
    });
});

// Nisja e serverit
app.listen(PORT, () => {
    console.log(`🚀 Shërbimi i Produkteve (MySQL) po lë në portën ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
});

// Menaxhimi i mbylljes së aplikacionit
process.on('SIGINT', async () => {
    console.log('\n🛑 Mbyllja e shërbimit të produkteve...');
    await pool.end();
    console.log('✅ Lidhja me bazën e të dhënave u mbyll');
    process.exit(0);
});