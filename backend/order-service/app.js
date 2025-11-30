const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

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

const pool = mysql.createPool(dbConfig);

// Krijo porosi të re
app.post('/api/orders', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { user_id, items, shipping_address, payment_method } = req.body;
        
        // Llogarit totalin
        let total_amount = 0;
        for (const item of items) {
            // Kontrollo nëse produkti ekziston dhe ka stok
            const [productRows] = await connection.execute(
                'SELECT price, stock_quantity FROM Products WHERE id = ?',
                [item.product_id]
            );
            
            if (productRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Produkti me ID ${item.product_id} nuk u gjet`
                });
            }
            
            const product = productRows[0];
            
            if (product.stock_quantity < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Nuk ka stok të mjaftueshëm për produktin: ${item.product_id}`
                });
            }
            
            const itemTotal = product.price * item.quantity;
            total_amount += itemTotal;
        }
        
        // Krijo porosinë
        const [orderResult] = await connection.execute(
            `INSERT INTO Orders (user_id, total_amount, shipping_address, payment_method)
             VALUES (?, ?, ?, ?)`,
            [user_id, total_amount, shipping_address, payment_method]
        );
        
        const orderId = orderResult.insertId;
        
        // Shto artikujt e porosisë dhe përditëso stokun
        for (const item of items) {
            const [productRows] = await connection.execute(
                'SELECT price FROM Products WHERE id = ?',
                [item.product_id]
            );
            
            const product = productRows[0];
            const itemTotal = product.price * item.quantity;
            
            // Shto artikullin e porosisë
            await connection.execute(
                `INSERT INTO OrderItems (order_id, product_id, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, product.price, itemTotal]
            );
            
            // Përditëso stokun
            await connection.execute(
                'UPDATE Products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        await connection.commit();
        
        // Merr porosinë e plotë
        const finalOrder = await getOrderWithDetails(orderId);
        
        res.status(201).json({
            success: true,
            data: finalOrder,
            message: 'Porosia u krijua me sukses'
        });
        
    } catch (err) {
        await connection.rollback();
        console.error('Gabim në krijimin e porosisë:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit në krijimin e porosisë'
        });
    } finally {
        connection.release();
    }
});

// Merr të gjitha porositë e një përdoruesi
app.get('/api/orders/user/:user_id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { user_id } = req.params;
        
        const [rows] = await connection.execute(
            `SELECT o.*, 
             (SELECT COUNT(*) FROM OrderItems WHERE order_id = o.id) as item_count
             FROM Orders o 
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC`,
            [user_id]
        );
        
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Gabim në marrjen e porosive:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Merr porosi sipas ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await getOrderWithDetails(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Porosia nuk u gjet'
            });
        }
        
        res.json({
            success: true,
            data: order
        });
    } catch (err) {
        console.error('Gabim në marrjen e porosisë:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    }
});

// Përditëso statusin e porosisë
app.put('/api/orders/:id/status', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = req.params;
        const { status } = req.body;
        
        const [result] = await connection.execute(
            'UPDATE Orders SET status = ? WHERE id = ?',
            [status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Porosia nuk u gjet'
            });
        }
        
        // Merr porosinë e përditësuar
        const [rows] = await connection.execute(
            'SELECT * FROM Orders WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            data: rows[0],
            message: 'Statusi i porosisë u përditësua'
        });
    } catch (err) {
        console.error('Gabim në përditësimin e porosisë:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Funksion ndihmës për të marrë porosi me detaje
async function getOrderWithDetails(orderId) {
    const connection = await pool.getConnection();
    
    try {
        // Merr të dhënat bazë të porosisë
        const [orderRows] = await connection.execute(
            `SELECT o.*, u.username, u.full_name, u.email
             FROM Orders o
             LEFT JOIN Users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [orderId]
        );
        
        if (orderRows.length === 0) {
            return null;
        }
        
        const order = orderRows[0];
        
        // Merr artikujt e porosisë
        const [itemsRows] = await connection.execute(
            `SELECT oi.*, p.name as product_name, p.image_url
             FROM OrderItems oi
             LEFT JOIN Products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [orderId]
        );
        
        order.items = itemsRows;
        
        return order;
    } finally {
        connection.release();
    }
}

// Ruta për health check
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        res.json({ 
            status: 'UP', 
            service: 'order-service',
            database: 'MySQL',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'DOWN', 
            service: 'order-service',
            error: err.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Shërbimi i Porosive (MySQL) po lë në portën ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
});