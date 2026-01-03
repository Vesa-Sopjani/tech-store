const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TechProductDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Pjesa tjetër e kodit mbetet e njëjtë...
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.full_name = data.full_name;
    this.address = data.address;
    this.phone = data.phone;
    this.role = data.role || 'customer';
    this.refresh_token = data.refresh_token;
    this.failed_attempts = data.failed_attempts || 0;
    this.locked_until = data.locked_until;
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.last_login = data.last_login;
    this.email_verified = data.email_verified === 1;
    this.verification_token = data.verification_token;
    this.verification_expires = data.verification_expires;
    this.verified_at = data.verified_at;
    this.two_factor_enabled = data.two_factor_enabled === 1;
    this.two_factor_secret = data.two_factor_secret;
    this.two_factor_backup_codes = data.two_factor_backup_codes ? 
      JSON.parse(data.two_factor_backup_codes) : null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.is_deleted = data.is_deleted === 1;
  }

  // Find user by ID
  static async findById(id) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM Users WHERE id = ? AND is_deleted = 0`,
        [id]
      );
      connection.release();
      
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM Users WHERE email = ? AND is_deleted = 0`,
        [email]
      );
      connection.release();
      
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM Users WHERE username = ? AND is_deleted = 0`,
        [username]
      );
      connection.release();
      
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const connection = await pool.getConnection();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(
        userData.password, 
        parseInt(process.env.BCRYPT_ROUNDS) || 12
      );

      // Generate verification token
      const verificationToken = uuidv4();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const [result] = await connection.execute(
        `INSERT INTO Users (
          username, email, password, full_name, address, phone, role,
          verification_token, verification_expires, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.email,
          hashedPassword,
          userData.full_name,
          userData.address || null,
          userData.phone || null,
          userData.role || 'customer',
          verificationToken,
          verificationExpires,
          JSON.stringify(userData.metadata || {})
        ]
      );

      const [newUserRows] = await connection.execute(
        `SELECT * FROM Users WHERE id = ?`,
        [result.insertId]
      );
      
      connection.release();
      
      if (newUserRows.length === 0) return null;
      return new User(newUserRows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData) {
    try {
      const connection = await pool.getConnection();
      
      const updateFields = [];
      const updateValues = [];
      
      // Build dynamic update query
      if (updateData.full_name !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(updateData.full_name);
      }
      
      if (updateData.address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(updateData.address);
      }
      
      if (updateData.phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(updateData.phone);
      }
      
      if (updateData.email !== undefined) {
        updateFields.push('email = ?, email_verified = 0');
        updateValues.push(updateData.email);
        // Generate new verification token when email changes
        const verificationToken = uuidv4();
        updateFields.push('verification_token = ?, verification_expires = ?');
        updateValues.push(verificationToken);
        updateValues.push(new Date(Date.now() + 24 * 60 * 60 * 1000));
      }
      
      if (updateData.password !== undefined) {
        const hashedPassword = await bcrypt.hash(
          updateData.password, 
          parseInt(process.env.BCRYPT_ROUNDS) || 12
        );
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }
      
      if (updateFields.length === 0) {
        connection.release();
        return this;
      }
      
      updateValues.push(this.id);
      
      await connection.execute(
        `UPDATE Users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );
      
      // Get updated user
      const [updatedUserRows] = await connection.execute(
        `SELECT * FROM Users WHERE id = ?`,
        [this.id]
      );
      
      connection.release();
      
      if (updatedUserRows.length === 0) return null;
      return new User(updatedUserRows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      if (this.email_verified) {
        return { success: false, message: 'Email already verified' };
      }
      
      if (this.verification_token !== token) {
        return { success: false, message: 'Invalid verification token' };
      }
      
      if (new Date() > new Date(this.verification_expires)) {
        return { success: false, message: 'Verification token expired' };
      }
      
      const connection = await pool.getConnection();
      await connection.execute(
        `UPDATE Users SET 
         email_verified = 1, 
         verification_token = NULL, 
         verification_expires = NULL,
         verified_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [this.id]
      );
      
      connection.release();
      
      this.email_verified = true;
      this.verification_token = null;
      this.verification_expires = null;
      this.verified_at = new Date();
      
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  // Check password
  async checkPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('Error checking password:', error);
      throw error;
    }
  }

  // Generate JWT tokens
  generateTokens() {
    const accessToken = jwt.sign(
      {
        id: this.id,
        username: this.username,
        email: this.email,
        role: this.role,
        verified: this.email_verified,
        jti: `access_${Date.now()}_${uuidv4()}`
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      {
        id: this.id,
        type: 'refresh',
        jti: `refresh_${Date.now()}_${uuidv4()}`
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }

  // Record failed login attempt
  async recordFailedLogin() {
    try {
      const connection = await pool.getConnection();
      
      const newFailedAttempts = this.failed_attempts + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await connection.execute(
        `UPDATE Users SET 
         failed_attempts = ?,
         locked_until = ?
         WHERE id = ?`,
        [newFailedAttempts, lockedUntil, this.id]
      );
      
      connection.release();
      
      this.failed_attempts = newFailedAttempts;
      this.locked_until = lockedUntil;
      
      return { failedAttempts: newFailedAttempts, lockedUntil };
    } catch (error) {
      console.error('Error recording failed login:', error);
      throw error;
    }
  }

  // Reset failed attempts on successful login
  async resetFailedAttempts() {
    try {
      const connection = await pool.getConnection();
      
      await connection.execute(
        `UPDATE Users SET 
         failed_attempts = 0,
         locked_until = NULL,
         last_login = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [this.id]
      );
      
      connection.release();
      
      this.failed_attempts = 0;
      this.locked_until = null;
      this.last_login = new Date();
      
      return true;
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
      throw error;
    }
  }

  // Check if account is locked
  isLocked() {
    if (!this.locked_until) return false;
    return new Date() < new Date(this.locked_until);
  }

  // Soft delete user
  async softDelete() {
    try {
      const connection = await pool.getConnection();
      
      await connection.execute(
        `UPDATE Users SET 
         is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         username = CONCAT(username, '_deleted_', ?),
         email = CONCAT(email, '_deleted_', ?)
         WHERE id = ?`,
        [Date.now(), Date.now(), this.id]
      );
      
      connection.release();
      
      this.is_deleted = true;
      this.deleted_at = new Date();
      
      return true;
    } catch (error) {
      console.error('Error soft deleting user:', error);
      throw error;
    }
  }

  // Get safe user data (without sensitive info)
  toSafeJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      full_name: this.full_name,
      address: this.address,
      phone: this.phone,
      role: this.role,
      email_verified: this.email_verified,
      two_factor_enabled: this.two_factor_enabled,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }


  // ==== ADMIN METHODS ====

// Get all users (with pagination and filters)
static async findAll({ page = 1, limit = 20, search = '', role = '', sortBy = 'created_at', sortOrder = 'DESC' } = {}) {
  try {
    const connection = await pool.getConnection();
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        id, username, email, full_name, address, phone, role,
        email_verified, failed_attempts, locked_until, last_login,
        created_at, updated_at, is_deleted, deleted_at
      FROM Users 
      WHERE 1=1
    `;
    const queryParams = [];
    
    // Apply search filter
    if (search) {
      query += ` AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Apply role filter
    if (role) {
      query += ` AND role = ?`;
      queryParams.push(role);
    }
    
    // Filter out deleted users by default (admin can choose to see them)
    query += ` AND is_deleted = 0`;
    
    // Get total count for pagination
    const countQuery = query.replace('SELECT id, username, email, full_name, address, phone, role, email_verified, failed_attempts, locked_until, last_login, created_at, updated_at, is_deleted, deleted_at', 'SELECT COUNT(*) as total');
    const [countRows] = await connection.execute(countQuery, queryParams);
    const total = countRows[0].total;
    
    // Apply sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    const [rows] = await connection.execute(query, queryParams);
    connection.release();
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      users: rows.map(row => new User(row)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
  } catch (error) {
    console.error('Error finding all users:', error);
    throw error;
  }
}

// Get deleted users
static async findDeleted({ page = 1, limit = 20 } = {}) {
  try {
    const connection = await pool.getConnection();
    
    const offset = (page - 1) * limit;
    
    const [rows] = await connection.execute(
      `SELECT 
        id, username, email, full_name, role,
        created_at, deleted_at
      FROM Users 
      WHERE is_deleted = 1
      ORDER BY deleted_at DESC 
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    // Get total count
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) as total FROM Users WHERE is_deleted = 1`
    );
    
    connection.release();
    
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      users: rows.map(row => new User(row)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    };
  } catch (error) {
    console.error('Error finding deleted users:', error);
    throw error;
  }
}

// Force delete user (permanent)
static async forceDelete(id) {
  try {
    const connection = await pool.getConnection();
    
    // First check if user exists
    const [checkRows] = await connection.execute(
      'SELECT id FROM Users WHERE id = ?',
      [id]
    );
    
    if (checkRows.length === 0) {
      connection.release();
      return { success: false, message: 'User not found' };
    }
    
    // Delete user permanently
    await connection.execute(
      'DELETE FROM Users WHERE id = ?',
      [id]
    );
    
    connection.release();
    
    return { success: true, message: 'User permanently deleted' };
  } catch (error) {
    console.error('Error force deleting user:', error);
    throw error;
  }
}

// Restore soft-deleted user
static async restore(id) {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `UPDATE Users SET 
        is_deleted = 0,
        deleted_at = NULL,
        username = SUBSTRING_INDEX(username, '_deleted_', 1),
        email = SUBSTRING_INDEX(email, '_deleted_', 1)
      WHERE id = ? AND is_deleted = 1`,
      [id]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return { success: false, message: 'User not found or not deleted' };
    }
    
    return { success: true, message: 'User restored successfully' };
  } catch (error) {
    console.error('Error restoring user:', error);
    throw error;
  }
}

// Update user role (admin only)
async updateRole(newRole, adminId) {
  try {
    const validRoles = ['customer', 'admin', 'moderator', 'staff'];
    
    if (!validRoles.includes(newRole)) {
      return { success: false, message: 'Invalid role' };
    }
    
    // Cannot change own role
    if (this.id === adminId) {
      return { success: false, message: 'Cannot change your own role' };
    }
    
    const connection = await pool.getConnection();
    
    await connection.execute(
      `UPDATE Users SET 
        role = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = ?
      WHERE id = ?`,
      [newRole, adminId, this.id]
    );
    
    connection.release();
    
    this.role = newRole;
    
    return { success: true, message: 'User role updated successfully' };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Lock/unlock user account
async toggleLock(locked = true, adminId) {
  try {
    const connection = await pool.getConnection();
    
    if (locked) {
      // Lock account for 24 hours
      const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await connection.execute(
        `UPDATE Users SET 
          locked_until = ?,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ?
        WHERE id = ?`,
        [lockedUntil, adminId, this.id]
      );
      
      this.locked_until = lockedUntil;
      
      return { 
        success: true, 
        message: 'User account locked for 24 hours',
        lockedUntil 
      };
    } else {
      // Unlock account
      await connection.execute(
        `UPDATE Users SET 
          locked_until = NULL,
          failed_attempts = 0,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ?
        WHERE id = ?`,
        [adminId, this.id]
      );
      
      this.locked_until = null;
      this.failed_attempts = 0;
      
      return { success: true, message: 'User account unlocked' };
    }
  } catch (error) {
    console.error('Error toggling user lock:', error);
    throw error;
  }
}

// Get user statistics
static async getStatistics() {
  try {
    const connection = await pool.getConnection();
    
    // Get counts by role
    const [roleStats] = await connection.execute(`
      SELECT 
        role,
        COUNT(*) as count,
        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END) as locked_count
      FROM Users 
      WHERE is_deleted = 0
      GROUP BY role
    `);
    
    // Get total counts
    const [totalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_registrations,
        SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_last_7_days
      FROM Users 
      WHERE is_deleted = 0
    `);
    
    // Get registration trends (last 30 days)
    const [trends] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM Users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND is_deleted = 0
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    connection.release();
    
    return {
      roleStats,
      totalStats: totalStats[0] || {},
      trends
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw error;
  }
}

  // Get full user data (for internal use)
  toJSON() {
    return {
      ...this.toSafeJSON(),
      failed_attempts: this.failed_attempts,
      locked_until: this.locked_until,
      metadata: this.metadata,
      is_deleted: this.is_deleted
    };
  }
}

module.exports = User;