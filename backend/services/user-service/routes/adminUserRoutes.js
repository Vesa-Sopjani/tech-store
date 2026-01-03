const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../../../middlewares/authenticateToken');
const adminAuth = require('../../../middlewares/adminAuth');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

// ==================== RUGAT TEST ====================
router.get('/test', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    console.log('🧪 TEST /api/admin/users/test');
    connection = await pool.getConnection();
    
    const [count] = await connection.query('SELECT COUNT(*) as total FROM Users');
    const [users] = await connection.query('SELECT id, username, email FROM Users LIMIT 5');
    
    res.json({
      success: true,
      total: count[0].total,
      users: users
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== GET USERS (ME PAGINATION) ====================
router.get('/', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    console.log('📋 GET /api/admin/users');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    const showDeleted = req.query.showDeleted === 'true';
    
    connection = await pool.getConnection();
    
    // Krijimi i WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (!showDeleted) {
      whereClause += ' AND is_deleted = 0';
    } else {
      whereClause += ' AND is_deleted = 1';
    }
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    // Validimi i sort
    const allowedSort = ['username', 'email', 'full_name', 'created_at', 'last_login'];
    const validSortBy = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Merr totalin
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM Users ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // Merr përdoruesit
    const [users] = await connection.query(
      `SELECT id, username, email, full_name, role, phone, address, 
              email_verified, is_deleted, locked_until, last_login, created_at
       FROM Users 
       ${whereClause} 
       ORDER BY ${validSortBy} ${validSortOrder} 
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    
    console.log(`✅ Found ${users.length} users`);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== GET USER BY ID ====================
router.get('/:id', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    console.log(`👤 GET /api/admin/users/${userId}`);
    
    connection = await pool.getConnection();
    
    const [users] = await connection.query(
      `SELECT id, username, email, full_name, role, phone, address, 
              email_verified, is_deleted, locked_until, last_login, created_at
       FROM Users WHERE id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
    
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== CREATE USER ====================
router.post('/', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    console.log('➕ POST /api/admin/users - Create user');
    const { username, email, password, full_name, role, phone, address } = req.body;
    
    // Validimi
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    connection = await pool.getConnection();
    
    // Kontrollo nëse ekziston
    const [existing] = await connection.query(
      'SELECT id FROM Users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Krijo përdorues - KORRIGJUAR: përdor 'password' jo 'password_hash'
    const [result] = await connection.query(
      `INSERT INTO Users (username, email, password, full_name, role, phone, address, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [username, email, hashedPassword, full_name || '', role || 'customer', phone || '', address || '']
    );
    
    // Merr përdoruesin e krijuar
    const [newUser] = await connection.query(
      'SELECT id, username, email, full_name, role, phone, address, created_at FROM Users WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ User created: ${username} (ID: ${result.insertId})`);
    
    res.status(201).json({
      success: true,
      data: newUser[0],
      message: 'User created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('❌ Full error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
      sqlMessage: error.sqlMessage
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== UPDATE USER ====================
router.put('/:id', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    console.log(`✏️ PUT /api/admin/users/${userId} - Update user`);
    
    const { username, email, full_name, role, phone, address, password } = req.body;
    
    connection = await pool.getConnection();
    
    // Kontrollo nëse përdoruesi ekziston
    const [existing] = await connection.query(
      'SELECT id FROM Users WHERE id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Përgatit të dhënat për update
    const updateFields = [];
    const updateValues = [];
    
    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    
    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    
    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push('password = ?'); // KORRIGJUAR: 'password' jo 'password_hash'
      updateValues.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);
    
    // Ekzekuto update
    await connection.query(
      `UPDATE Users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Merr përdoruesin e përditësuar
    const [updatedUser] = await connection.query(
      'SELECT id, username, email, full_name, role, phone, address, email_verified, created_at FROM Users WHERE id = ?',
      [userId]
    );
    
    console.log(`✅ User updated: ID ${userId}`);
    
    res.json({
      success: true,
      data: updatedUser[0],
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== DELETE USER (SOFT DELETE) ====================
router.delete('/:id', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';
    
    console.log(`🗑️ DELETE /api/admin/users/${userId} - Permanent: ${permanent}`);
    
    connection = await pool.getConnection();
    
    // Kontrollo nëse përdoruesi ekziston
    const [existing] = await connection.query(
      'SELECT id, is_deleted FROM Users WHERE id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (permanent) {
      // Fshije përfundimisht
      await connection.query('DELETE FROM Users WHERE id = ?', [userId]);
      console.log(`✅ User permanently deleted: ID ${userId}`);
    } else {
      // Soft delete
      await connection.query(
        'UPDATE Users SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
        [userId]
      );
      console.log(`✅ User soft deleted: ID ${userId}`);
    }
    
    res.json({
      success: true,
      message: permanent ? 'User permanently deleted' : 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== RESTORE USER ====================
router.post('/:id/restore', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    console.log(`↩️ POST /api/admin/users/${userId}/restore`);
    
    connection = await pool.getConnection();
    
    // Restauro përdoruesin
    const [result] = await connection.query(
      'UPDATE Users SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
      [userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not deleted'
      });
    }
    
    console.log(`✅ User restored: ID ${userId}`);
    
    res.json({
      success: true,
      message: 'User restored successfully'
    });
    
  } catch (error) {
    console.error('❌ Error restoring user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== LOCK USER ====================
router.post('/:id/lock', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    console.log(`🔒 POST /api/admin/users/${userId}/lock`);
    
    connection = await pool.getConnection();
    
    // Blloko përdoruesin për 24 orë
    const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    await connection.query(
      'UPDATE Users SET locked_until = ? WHERE id = ?',
      [lockUntil, userId]
    );
    
    console.log(`✅ User locked until: ${lockUntil}`);
    
    res.json({
      success: true,
      message: 'User locked successfully'
    });
    
  } catch (error) {
    console.error('❌ Error locking user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== UNLOCK USER ====================
router.post('/:id/unlock', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    console.log(`🔓 POST /api/admin/users/${userId}/unlock`);
    
    connection = await pool.getConnection();
    
    // Zhblloko përdoruesin
    await connection.query(
      'UPDATE Users SET locked_until = NULL WHERE id = ?',
      [userId]
    );
    
    console.log(`✅ User unlocked: ID ${userId}`);
    
    res.json({
      success: true,
      message: 'User unlocked successfully'
    });
    
  } catch (error) {
    console.error('❌ Error unlocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock user',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== CHANGE ROLE ====================
router.post('/:id/role', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    console.log(`👑 POST /api/admin/users/${userId}/role - New role: ${role}`);
    
    if (!role || !['admin', 'moderator', 'staff', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (admin, moderator, staff, customer)'
      });
    }
    
    connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE Users SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    console.log(`✅ User role updated: ID ${userId} -> ${role}`);
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error changing role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change role',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== RESET PASSWORD ====================
router.post('/:id/reset-password', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    console.log(`🔑 POST /api/admin/users/${userId}/reset-password`);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }
    
    connection = await pool.getConnection();
    
    // Hash password-in e ri - KORRIGJUAR: 'password' jo 'password_hash'
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await connection.query(
      'UPDATE Users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    console.log(`✅ Password reset for user ID: ${userId}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});




// ==================== GET STATISTICS ====================
router.get('/statistics/overview', authenticateToken, adminAuth, async (req, res) => {
  let connection;
  try {
    console.log('📊 GET /api/admin/users/statistics/overview');
    
    connection = await pool.getConnection();

    // Merr statistikat e roleve
    const [roleStats] = await connection.query(`
      SELECT 
        role,
        COUNT(*) as count,
        SUM(email_verified = 1) as verified_count,
        SUM(locked_until IS NOT NULL AND locked_until > NOW()) as locked_count
      FROM Users 
      WHERE is_deleted = 0
      GROUP BY role
    `);

    // Merr statistikat totale
    const [totalStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(DATE(created_at) = CURDATE()) as today_registrations,
        SUM(last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as active_last_7_days
      FROM Users 
      WHERE is_deleted = 0
    `);

    // Merr trendet e regjistrimeve të fundit
    const [trends] = await connection.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM Users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND is_deleted = 0
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        roleStats,
        totalStats: totalStats[0],
        trends
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;