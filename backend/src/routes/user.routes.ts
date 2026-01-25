// backend/src/routes/user.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import UserService from '../services/userService';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { pool } from '../config/database';

const router = Router();
const userService = new UserService(pool);

router.use(requireAuth, requireRole('user', 'admin'));

/**
 * GET /users/:id - Get user profile
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      const profile = await userService.getUserProfile(id);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /users/:id - Update user profile
 */
router.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, profileImageUrl, dateOfBirth } = req.body;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      const profile = await userService.updateProfile(id, {
        firstName,
        lastName,
        phone,
        profileImageUrl,
        dateOfBirth,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /users/:id/addresses - Get user addresses
 */
router.get(
  '/:id/addresses',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      const addresses = await userService.getUserAddresses(id);

      res.status(200).json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /users/:id/addresses - Add new address
 */
router.post(
  '/:id/addresses',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { addressLine1, addressLine2, city, state, postalCode, country, isDefault, addressType } = req.body;

      if (!id || !addressLine1 || !city || !state || !postalCode || !country) {
        throw new ValidationError('User ID and address details are required');
      }

      const address = await userService.addAddress(id, {
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault,
        addressType,
      });

      res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /users/:id/addresses/:addressId - Update address
 */
router.patch(
  '/:id/addresses/:addressId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, addressId } = req.params;

      if (!id || !addressId) {
        throw new ValidationError('User ID and Address ID are required');
      }

      const address = await userService.updateAddress(id, addressId, req.body);

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /users/:id/addresses/:addressId - Delete address
 */
router.delete(
  '/:id/addresses/:addressId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, addressId } = req.params;

      if (!id || !addressId) {
        throw new ValidationError('User ID and Address ID are required');
      }

      const result = await userService.deleteAddress(id, addressId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
