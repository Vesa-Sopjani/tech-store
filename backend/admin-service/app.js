const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

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

// Middleware për verifikimin e adminit
const authenticateAdmin = (req, res, next) => {
    // Për demonstrim, po e kalojmë verifikimin
    // Në prodhim duhet të verifikohet tokeni JWT dhe roli i përdoruesit
    next();
};

// 📊 STATISTIKAT E PËRGJITHSHME
app.get('/api/admin/statistics', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Query të ndryshme për statistikat
        const [totalUsers] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        const [totalProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products');
        const [totalOrders] = await connection.execute('SELECT COUNT(*) as count FROM Orders');
        const [totalRevenue] = await connection.execute('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM Orders WHERE status = "completed"');
        const [lowStockProducts] = await connection.execute('SELECT COUNT(*) as count FROM Products WHERE stock_quantity < 10');
        
        // Statistikat e porosive sipas muajve
        const [monthlyOrders] = await connection.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM Orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `);
        
        // Produktet më të shitura
        const [topProducts] = await connection.execute(`
            SELECT 
                p.name,
                p.id,
                COALESCE(SUM(oi.quantity), 0) as total_sold,
                COALESCE(SUM(oi.total_price), 0) as total_revenue
            FROM Products p
            LEFT JOIN OrderItems oi ON p.id = oi.product_id
            LEFT JOIN Orders o ON oi.order_id = o.id AND o.status = 'completed'
            GROUP BY p.id, p.name
            ORDER BY total_sold DESC
            LIMIT 10
        `);
        
        // Përdoruesit e rinj
        const [newUsers] = await connection.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                COUNT(*) as user_count
            FROM Users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers: totalUsers[0].count,
                    totalProducts: totalProducts[0].count,
                    totalOrders: totalOrders[0].count,
                    totalRevenue: totalRevenue[0].revenue,
                    lowStockProducts: lowStockProducts[0].count
                },
                monthlyOrders,
                topProducts,
                newUsers
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në marrjen e statistikave:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 📦 TË GJITHA POROSITË
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { page = 1, limit = 10, status = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                o.*,
                u.username,
                u.email,
                u.full_name,
                COUNT(oi.id) as items_count
            FROM Orders o
            LEFT JOIN Users u ON o.user_id = u.id
            LEFT JOIN OrderItems oi ON o.id = oi.order_id
        `;
        
        const params = [];
        
        if (status) {
            query += ` WHERE o.status = ?`;
            params.push(status);
        }
        
        query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [orders] = await connection.execute(query, params);
        
        // Merr artikujt për çdo porosi
        for (let order of orders) {
            const [items] = await connection.execute(`
                SELECT oi.*, p.name as product_name, p.image_url
                FROM OrderItems oi
                LEFT JOIN Products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [order.id]);
            order.items = items;
        }
        
        // Total count për pagination
        const [totalCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM Orders' + (status ? ' WHERE status = ?' : ''),
            status ? [status] : []
        );
        
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount[0].count / limit),
                    totalItems: totalCount[0].count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në marrjen e porosive:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 👥 TË GJITHË PËRDORUESIT
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const [users] = await connection.execute(`
            SELECT 
                u.*,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM Users u
            LEFT JOIN Orders o ON u.id = o.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);
        
        const [totalCount] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount[0].count / limit),
                    totalItems: totalCount[0].count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në marrjen e përdoruesve:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 🕒 TË DHËNA NË KOHË REALE
app.get('/api/admin/realtime', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Porositë e fundit (24 orët e fundit)
        const [recentOrders] = await connection.execute(`
            SELECT 
                o.id,
                o.total_amount,
                o.status,
                o.created_at,
                u.username,
                u.full_name
            FROM Orders o
            JOIN Users u ON o.user_id = u.id
            WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
        // Aktiviteti i përdoruesve
        const [userActivity] = await connection.execute(`
            SELECT 
                u.username,
                COUNT(o.id) as order_count,
                MAX(o.created_at) as last_order
            FROM Users u
            LEFT JOIN Orders o ON u.id = o.user_id
            WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY u.id, u.username
            ORDER BY order_count DESC
            LIMIT 10
        `);
        
        // Statistikat e shpejta
        const [todayOrders] = await connection.execute(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue 
            FROM Orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        const [weeklyRevenue] = await connection.execute(`
            SELECT COALESCE(SUM(total_amount), 0) as revenue 
            FROM Orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND status = 'completed'
        `);

        res.json({
            success: true,
            data: {
                recentOrders,
                userActivity,
                quickStats: {
                    todayOrders: todayOrders[0].count,
                    todayRevenue: todayOrders[0].revenue,
                    weeklyRevenue: weeklyRevenue[0].revenue
                }
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në marrjen e të dhënave në kohë reale:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 🔄 PËRDITËSO STATUSIN E POROSISË
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
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
        
        res.json({
            success: true,
            message: 'Statusi i porosisë u përditësua'
        });
        
    } catch (err) {
        console.error('❌ Gabim në përditësimin e statusit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 🩺 HEALTH CHECK
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        res.json({ 
            status: 'UP', 
            service: 'admin-service',
            database: 'MySQL',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'DOWN', 
            service: 'admin-service',
            error: err.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Shërbimi i Adminit po lë në portën ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
});