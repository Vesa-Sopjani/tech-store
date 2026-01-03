const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

// Middleware
const authenticateToken = require('../../../middlewares/authenticateToken');
const attachAccessToken = require('../../../middlewares/attachAccessToken');

// Database pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const { username, email, password, full_name, address, phone, role = 'customer', metadata } = req.body;
    
    // Validimi
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Kontrollo user ekzistues
    const [existingUsers] = await connection.execute(
      'SELECT id FROM Users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    // Krijo user
    const [result] = await connection.execute(
      `INSERT INTO Users (username, email, password, full_name, address, phone, role, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, full_name, address, phone, role, JSON.stringify(metadata || {})]
    );
    
    // Merr user-in e krijuar
    const [userRows] = await connection.execute(
      'SELECT id, username, email, full_name, role FROM Users WHERE id = ?',
      [result.insertId]
    );
    
    const user = userRows[0];
    
    // Krijo refresh token (7 ditë)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        jti: uuidv4()
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Ruaje refresh token në DB
    await connection.execute(
      'UPDATE Users SET refresh_token = ? WHERE id = ?',
      [refreshToken, user.id]
    );
    
    // Vendos refresh token në HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ditë
      path: '/'
    });
    
    // Kalimi në middleware për të gjeneruar access token
    req.userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next(); // Shko te attachAccessToken middleware
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  } finally {
    if (connection) connection.release();
  }
}, attachAccessToken, (req, res) => {
  // Kthe response pasi middleware përfundon
  res.status(201).json({
    success: true,
    message: 'Registration successful!',
    user: req.userData
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  let connection;
  try {
    const { identifier, password } = req.body;
    console.log(`🔐 Login attempt for: ${identifier}`);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username and password are required'
      });
    }

    connection = await pool.getConnection();

    // Gjej user-in
    const [users] = await connection.execute(
      'SELECT * FROM Users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    const user = users[0];

    // Verifiko password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    // Krijo refresh token të ri (rotation)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        jti: uuidv4()
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Ruaje refresh token në DB
    await connection.execute(
      'UPDATE Users SET refresh_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [refreshToken, user.id]
    );

    // Vendos refresh token në HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ditë
      path: '/'
    });

    // Kalimi në middleware për të gjeneruar access token
    req.userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next(); // Shko te attachAccessToken middleware
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  } finally {
    if (connection) connection.release();
  }
}, attachAccessToken, (req, res) => {
  // Response pas middleware
  res.json({
    success: true,
    message: 'Login successful!',
    user: req.userData
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (me refresh token)
 */
router.post('/refresh', async (req, res, next) => {
  let connection;
  try {
    console.log('🔄 Refresh token request received');
    
    // Merr refresh token nga cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      console.log('❌ No refresh token in cookie');
      return res.status(401).json({
        success: false,
        message: 'No refresh token. Please login again.',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verifiko refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== 'refresh') {
      console.log('❌ Invalid token type');
      return res.status(403).json({
        success: false,
        message: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    connection = await pool.getConnection();

    // Kontrollo nëse refresh token ekziston në DB
    const [users] = await connection.execute(
      'SELECT id, username, email, role, refresh_token FROM Users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      console.log(`❌ User not found: ${decoded.id}`);
      return res.status(403).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = users[0];

    // Kontrollo nëse refresh token-i në DB përputhet
    if (user.refresh_token !== refreshToken) {
      console.log(`❌ Refresh token mismatch for user: ${user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'TOKEN_MISMATCH'
      });
    }

    console.log(`✅ Refresh token valid for user: ${user.username}`);

    // Krijo refresh token të ri (rotation - optional por rekomandohet)
    const newRefreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        jti: uuidv4()
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update refresh token në DB
    await connection.execute(
      'UPDATE Users SET refresh_token = ? WHERE id = ?',
      [newRefreshToken, user.id]
    );

    // Vendos refresh token të ri në cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Kalimi në middleware për të gjeneruar access token
    req.refreshTokenData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next(); // Shko te attachAccessToken middleware
    
  } catch (error) {
    console.error('❌ Refresh token error:', error.name);
    
    if (error.name === 'TokenExpiredError') {
      // Fshi cookie nëse tokeni ka skaduar
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired. Please login again.',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      code: 'REFRESH_FAILED'
    });
  } finally {
    if (connection) connection.release();
  }
}, attachAccessToken, (req, res) => {
  // Response pas middleware
  res.json({
    success: true,
    message: 'Token refreshed successfully'
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (mund të jetë public)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  let connection;
  try {
    const refreshToken = req.cookies.refreshToken;
    const userId = req.user?.id;
    
    console.log(`🚪 Logout request for user: ${userId}`);
    
    if (refreshToken && userId) {
      connection = await pool.getConnection();
      
      // Fshi refresh token nga DB
      await connection.execute(
        'UPDATE Users SET refresh_token = NULL WHERE id = ?',
        [userId]
      );
      
      console.log(`✅ Refresh token cleared from DB for user: ${userId}`);
    }
    
    // Fshi të dy cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    console.log('✅ Cookies cleared');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Prapë fshij cookies edhe nëse ka error
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    res.json({
      success: true,
      message: 'Logged out (with cleanup)'
    });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    
    connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, username, email, full_name, role, created_at FROM Users WHERE id = ?',
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
      user: users[0]
    });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  } finally {
    if (connection) connection.release();
  }
});



/**
 * @route   GET /api/auth/validate
 * @desc    Validate if user is authenticated (për frontend)
 * @access  Private
 */
router.get('/validate', authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: req.user
  });
});
// Në fund të authRoutes.js, para module.exports, shtoni:

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { full_name, address, phone, currentPassword, newPassword } = req.body;
    
    connection = await pool.getConnection();
    
    // Merr user-in aktual
    const [userRows] = await connection.execute(
      'SELECT * FROM Users WHERE id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userRows[0];
    
    // Update fields
    const updateFields = [];
    const updateValues = [];
    
    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    
    // Password change requires current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updateValues.push(userId);
    
    await connection.execute(
      `UPDATE Users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );
    
    // Merr të dhënat e përditësuara
    const [updatedRows] = await connection.execute(
      'SELECT id, username, email, full_name, address, phone, role FROM Users WHERE id = ?',
      [userId]
    );
    
    connection.release();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedRows[0]
    });
    
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  } finally {
    if (connection) connection.release();
  }
});
module.exports = router;