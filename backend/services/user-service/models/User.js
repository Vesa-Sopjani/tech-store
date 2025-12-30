const pool = require('../dbConfig');
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