const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_tech_store_2024';

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
        console.log('✅ U lidh në bazën e të dhënave MySQL për përdoruesit!');
        
        // Kontrollo nëse ekziston përdoruesi admin
        const [adminUsers] = await connection.execute(
            'SELECT * FROM Users WHERE username = "admin"'
        );
        
        if (adminUsers.length === 0) {
            console.log('⚠️  Përdoruesi admin nuk ekziston. Duke krijuar...');
            
            // Krijo përdoruesin admin
            await connection.execute(
                `INSERT INTO Users (username, email, password, full_name, role, address, phone) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'admin', 
                    'admin@techstore.com', 
                    'admin123',  // Password i thjeshtë
                    'Administrator', 
                    'admin',
                    'Tirana, Albania',
                    '+355691234567'
                ]
            );
            console.log('✅ Përdoruesi admin u krijua me sukses!');
        } else {
            console.log('✅ Përdoruesi admin ekziston tashmë.');
        }
        
        connection.release();
    } catch (err) {
        console.error('❌ Gabim në lidhjen me bazën e të dhënave:', err);
        process.exit(1);
    }
}

testConnection();

// Middleware për verifikimin e tokenit
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token i nevojshëm për akses'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token i pavlefshëm'
            });
        }
        req.user = user;
        next();
    });
};

// 👤 REGJISTROHU - Krijo përdorues të ri
app.post('/api/auth/register', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { username, email, password, full_name, address, phone, role = 'customer' } = req.body;
        
        console.log(`📝 Regjistrim i ri: ${username}, email: ${email}, role: ${role}`);
        
        // Kontrollo nëse përdoruesi ekziston
        const [existingUsers] = await connection.execute(
            'SELECT id FROM Users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Përdoruesi me këtë username ose email ekziston'
            });
        }
        
        // Krijo përdoruesin ME PASSWORD TË THJESHTË (për demonstrim)
        // Në prodhim duhet të përdoret: const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.execute(
            `INSERT INTO Users (username, email, password, full_name, address, phone, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, email, password, full_name, address, phone, role]
        );
        
        // Merr përdoruesin e sapo krijuar
        const [userRows] = await connection.execute(
            'SELECT id, username, email, full_name, role, address, phone FROM Users WHERE id = ?',
            [result.insertId]
        );
        
        const user = userRows[0];
        
        // Gjenero token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        console.log('✅ Përdorues i ri u regjistrua:', user.username, 'Role:', user.role);
        
        res.status(201).json({
            success: true,
            data: {
                user: user,
                token
            },
            message: 'Përdoruesi u krijua me sukses'
        });
        
    } catch (err) {
        console.error('❌ Gabim në regjistrim:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit në regjistrim'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 🔐 HYR - Autentikim i përdoruesit
app.post('/api/auth/login', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { username, password } = req.body;
        
        console.log(`🔐 Tentativë hyrjeje: ${username}`);
        
        // Gjej përdoruesin me username OSE email
        const [users] = await connection.execute(
            'SELECT * FROM Users WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            console.log('❌ Përdoruesi nuk u gjet:', username);
            return res.status(401).json({
                success: false,
                message: 'Kredencialet janë të gabuara'
            });
        }
        
        const user = users[0];
        console.log('✅ Përdorues u gjet:', { 
            id: user.id, 
            username: user.username, 
            role: user.role 
        });
        
        // ✅ KONTROLLO PASSWORD-IN - KRAHASIM I THJESHTË
        // Në prodhim duhet: const isValidPassword = await bcrypt.compare(password, user.password);
        const isValidPassword = (user.password === password);
        
        console.log('🔑 Kontroll i password-it:', {
            passwordInput: password,
            passwordDB: user.password,
            isValid: isValidPassword
        });
        
        if (!isValidPassword) {
            console.log('❌ Password i gabuar për:', username);
            return res.status(401).json({
                success: false,
                message: 'Kredencialet janë të gabuara'
            });
        }
        
        // Gjenero token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        console.log('🎉 Hyrje e suksesshme:', user.username, 'Role:', user.role);
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    address: user.address,
                    phone: user.phone,
                    created_at: user.created_at
                },
                token
            },
            message: 'Hyrja u krye me sukses'
        });
        
    } catch (err) {
        console.error('❌ Gabim në hyrje:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit në hyrje'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 👤 MERR PROFILIN E PËRDORUESIT
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const userId = req.user.id;
        
        const [users] = await connection.execute(
            'SELECT id, username, email, full_name, address, phone, role, created_at FROM Users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Përdoruesi nuk u gjet'
            });
        }
        
        res.json({
            success: true,
            data: users[0]
        });
        
    } catch (err) {
        console.error('❌ Gabim në marrjen e profilit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// ✏️ PËRDITËSO PROFILIN E PËRDORUESIT
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const userId = req.user.id;
        const { email, full_name, address, phone } = req.body;
        
        const [result] = await connection.execute(
            `UPDATE Users 
             SET email = ?, full_name = ?, address = ?, phone = ?
             WHERE id = ?`,
            [email, full_name, address, phone, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Përdoruesi nuk u gjet'
            });
        }
        
        // Merr profilin e përditësuar
        const [users] = await connection.execute(
            'SELECT id, username, email, full_name, address, phone, role FROM Users WHERE id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            data: users[0],
            message: 'Profili u përditësua me sukses'
        });
        
    } catch (err) {
        console.error('❌ Gabim në përditësimin e profilit:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 📧 KONTROLLO EMAIL-IN (opsionale)
app.get('/api/users/check-email/:email', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { email } = req.params;
        
        const [users] = await connection.execute(
            'SELECT id FROM Users WHERE email = ?',
            [email]
        );
        
        res.json({
            success: true,
            data: {
                exists: users.length > 0,
                isAvailable: users.length === 0
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në kontrollin e email-it:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 👤 KONTROLLO USERNAME (opsionale)
app.get('/api/users/check-username/:username', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { username } = req.params;
        
        const [users] = await connection.execute(
            'SELECT id FROM Users WHERE username = ?',
            [username]
        );
        
        res.json({
            success: true,
            data: {
                exists: users.length > 0,
                isAvailable: users.length === 0
            }
        });
        
    } catch (err) {
        console.error('❌ Gabim në kontrollin e username:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 🔄 REFRESH TOKEN (opsionale)
app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // Gjenero token të ri
        const newToken = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token: newToken
            },
            message: 'Token u rifreskua me sukses'
        });
        
    } catch (err) {
        console.error('❌ Gabim në refresh token:', err);
        res.status(500).json({
            success: false,
            message: 'Gabim i serverit'
        });
    }
});

// 🩺 HEALTH CHECK - Kontrollo gjendjen e shërbimit
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        // Kontrollo nëse ka përdorues admin
        const adminConnection = await pool.getConnection();
        const [adminUsers] = await adminConnection.execute(
            'SELECT COUNT(*) as adminCount FROM Users WHERE role = "admin"'
        );
        adminConnection.release();
        
        res.json({ 
            status: 'UP', 
            service: 'user-service',
            database: 'MySQL',
            adminUsers: adminUsers[0].adminCount,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'DOWN', 
            service: 'user-service',
            error: err.message 
        });
    }
});

// 🏠 RUTA DEFAULT - Informacion për API
app.get('/', (req, res) => {
    res.json({ 
        message: 'User Service API - Tech Store', 
        version: '1.0.0',
        database: 'MySQL',
        endpoints: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            profile: 'GET /api/users/profile',
            updateProfile: 'PUT /api/users/profile',
            checkEmail: 'GET /api/users/check-email/:email',
            checkUsername: 'GET /api/users/check-username/:username',
            refreshToken: 'POST /api/auth/refresh',
            health: 'GET /health'
        },
        adminCredentials: {
            username: 'admin',
            password: 'admin123',
            email: 'admin@techstore.com',
            role: 'admin'
        }
    });
});

// ❌ MENAXHIMI I GABIMEVE
app.use((err, req, res, next) => {
    console.error('❌ Gabim global:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Diçka shkoi keq! Ju lutem provoni përsëri.'
    });
});

// 🔍 404 - Ruta nuk u gjet
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta nuk u gjet'
    });
});

// 🚀 NISJA E SERVERIT
app.listen(PORT, () => {
    console.log(`🚀 Shërbimi i Përdoruesve po lë në portën ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('🎛️  Kredencialet e Adminit:');
    console.log('   👤 Username: admin');
    console.log('   🔑 Password: admin123');
    console.log('   📧 Email: admin@techstore.com');
    console.log('');
});

// ♻️ MENAXHIMI I MBYLLJES SË APLIKACIONIT
process.on('SIGINT', async () => {
    console.log('\n🛑 Mbyllja e shërbimit të përdoruesve...');
    await pool.end();
    console.log('✅ Lidhja me bazën e të dhënave u mbyll');
    process.exit(0);
});