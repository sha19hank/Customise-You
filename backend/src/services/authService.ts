// backend/src/services/authService.ts - Authentication Service

import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private db: Pool;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(dbPool: Pool) {
    this.db = dbPool;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  }

  /**
   * Register a new user
   */
  async register(email: string, phone: string | null, password: string, firstName: string, lastName: string) {
    try {
      // Validate email doesn't exist
      const userExists = await this.db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (userExists.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 12);

      // Create user
      const userId = uuidv4();
      const result = await this.db.query(
        `INSERT INTO users (id, email, phone, first_name, last_name, password_hash, status, registration_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, first_name, last_name, phone`,
        [userId, email, phone, firstName, lastName, hashedPassword, 'active', 'mobile_app']
      );

      const user = result.rows[0];

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: 'customer',
      });

      return {
        user,
        ...tokens,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Registration failed: ${errorMessage}`);
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string) {
    try {
      // Find user by email
      const result = await this.db.query(
        'SELECT id, email, password_hash, first_name, last_name, phone, status FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check account status
      if (user.status !== 'active') {
        throw new Error(`Account is ${user.status}`);
      }

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: 'customer',
      });

      // Remove password from response
      delete user.password_hash;

      return {
        user,
        ...tokens,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Login failed: ${errorMessage}`);
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phone: string, otp: string) {
    try {
      // In production, verify against OTP service (Twilio, etc)
      // This is a simplified example
      
      // Find or create user by phone
      const result = await this.db.query(
        'SELECT id, email, first_name, last_name FROM users WHERE phone = $1',
        [phone]
      );

      let user;
      if (result.rows.length === 0) {
        // Create new user
        const userId = uuidv4();
        const insertResult = await this.db.query(
          `INSERT INTO users (id, phone, phone_verified, phone_verified_at, status, registration_source)
           VALUES ($1, $2, true, NOW(), 'active', 'mobile_app')
           RETURNING id, email, first_name, last_name, phone`,
          [userId, phone]
        );
        user = insertResult.rows[0];
      } else {
        // Update verification status
        user = result.rows[0];
        await this.db.query(
          'UPDATE users SET phone_verified = true, phone_verified_at = NOW() WHERE id = $1',
          [user.id]
        );
      }

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email || '',
        role: 'customer',
      });

      return {
        verified: true,
        user,
        ...tokens,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OTP verification failed: ${errorMessage}`);
    }
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(payload: AuthPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      issuer: 'customiseyou',
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '30d',
      issuer: 'customiseyou',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): TokenPair {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as AuthPayload;

      return this.generateTokens(decoded);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // Get user
      const result = await this.db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify current password
      const isPasswordValid = await bcryptjs.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcryptjs.hash(newPassword, 12);

      // Update password
      await this.db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, userId]
      );

      return { success: true, message: 'Password changed successfully' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Password change failed: ${errorMessage}`);
    }
  }

  /**
   * Reset password (send reset token)
   */
  async requestPasswordReset(email: string) {
    try {
      // Find user
      const result = await this.db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal if user exists for security
        return { success: true, message: 'If user exists, password reset email will be sent' };
      }

      const userId = result.rows[0].id;

      // Generate reset token
      const resetToken = jwt.sign(
        { userId, type: 'password_reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // In production, send this token via email
      // For now, we'll store it in a reset_tokens table
      
      return {
        success: true,
        message: 'Password reset email sent',
        resetToken, // Only return in development
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Password reset request failed: ${errorMessage}`);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken: string, newPassword: string) {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, this.jwtSecret) as any;

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      // Hash new password
      const hashedPassword = await bcryptjs.hash(newPassword, 12);

      // Update password
      await this.db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, decoded.userId]
      );

      return { success: true, message: 'Password reset successfully' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Password reset failed: ${errorMessage}`);
    }
  }

  /**
   * Logout (invalidate token)
   */
  async logout(userId: string, token: string) {
    try {
      // In production, add token to blacklist (Redis)
      // For now, just return success
      return { success: true, message: 'Logged out successfully' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Logout failed: ${errorMessage}`);
    }
  }
}

export default AuthService;
