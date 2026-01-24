// backend/src/services/userService.ts - User Management Service

import { Pool } from 'pg';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
}

export interface AddressRequest {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  addressType: 'home' | 'work' | 'other';
}

class UserService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string) {
    try {
      const result = await this.db.query(
        `SELECT id, email, phone, first_name, last_name, profile_image_url,
                date_of_birth, gender, status, email_verified, phone_verified,
                created_at, last_login_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch user profile: ${errorMessage}`);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileRequest) {
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [userId];
      let paramCount = 2;

      if (updateData.firstName) {
        updates.push(`first_name = $${paramCount}`);
        values.push(updateData.firstName);
        paramCount++;
      }

      if (updateData.lastName) {
        updates.push(`last_name = $${paramCount}`);
        values.push(updateData.lastName);
        paramCount++;
      }

      if (updateData.phone) {
        updates.push(`phone = $${paramCount}`);
        values.push(updateData.phone);
        paramCount++;
      }

      if (updateData.profileImageUrl) {
        updates.push(`profile_image_url = $${paramCount}`);
        values.push(updateData.profileImageUrl);
        paramCount++;
      }

      if (updateData.dateOfBirth) {
        updates.push(`date_of_birth = $${paramCount}`);
        values.push(updateData.dateOfBirth);
        paramCount++;
      }

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Remove password hash from response
      const user = result.rows[0];
      delete user.password_hash;

      return user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update profile: ${errorMessage}`);
    }
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string) {
    try {
      const result = await this.db.query(
        `SELECT * FROM addresses 
         WHERE user_id = $1 
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch addresses: ${errorMessage}`);
    }
  }

  /**
   * Add new address
   */
  async addAddress(userId: string, addressData: AddressRequest) {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // If this is default, unset other defaults
        if (addressData.isDefault) {
          await client.query(
            'UPDATE addresses SET is_default = false WHERE user_id = $1',
            [userId]
          );
        }

        const result = await client.query(
          `INSERT INTO addresses (
            user_id, address_line1, address_line2, city, state, 
            postal_code, country, is_default, address_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            userId,
            addressData.addressLine1,
            addressData.addressLine2,
            addressData.city,
            addressData.state,
            addressData.postalCode,
            addressData.country,
            addressData.isDefault || false,
            addressData.addressType,
          ]
        );

        await client.query('COMMIT');
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to add address: ${errorMessage}`);
    }
  }

  /**
   * Update address
   */
  async updateAddress(userId: string, addressId: string, addressData: Partial<AddressRequest>) {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Verify address belongs to user
        const checkResult = await client.query(
          'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
          [addressId, userId]
        );

        if (checkResult.rows.length === 0) {
          throw new Error('Address not found');
        }

        // If setting as default, unset others
        if (addressData.isDefault) {
          await client.query(
            'UPDATE addresses SET is_default = false WHERE user_id = $1',
            [userId]
          );
        }

        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [addressId];
        let paramCount = 2;

        Object.entries(addressData).forEach(([key, value]) => {
          if (value !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            updates.push(`${snakeKey} = $${paramCount}`);
            values.push(value);
            paramCount++;
          }
        });

        const query = `UPDATE addresses SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await client.query(query, values);

        await client.query('COMMIT');
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update address: ${errorMessage}`);
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(userId: string, addressId: string) {
    try {
      const result = await this.db.query(
        'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING *',
        [addressId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Address not found');
      }

      return { success: true, message: 'Address deleted successfully' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete address: ${errorMessage}`);
    }
  }
}

export default UserService;
