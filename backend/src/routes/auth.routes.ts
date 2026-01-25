// backend/src/routes/auth.routes.ts

import { Router, Request, Response, NextFunction } from "express";
import AuthService from "../services/authService";
import { ValidationError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validate";
import { getDatabase } from "../config/database";
import {
  changePasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../validators/auth.schema";

const router = Router();

/**
 * POST /auth/register
 */
router.post(
  "/register",
  validateBody(registerBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { email, password, phone, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        throw new ValidationError("Email, password, first name, and last name are required");
      }

      const user = await authService.register(email, phone || null, password, firstName, lastName);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/login
 */
router.post(
  "/login",
  validateBody(loginBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/verify-otp
 */
router.post(
  "/verify-otp",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        throw new ValidationError("Phone number and OTP are required");
      }

      const result = await authService.verifyOTP(phone, otp);

      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/refresh-token
 */
router.post(
  "/refresh-token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError("Refresh token is required");
      }

      const result = authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/change-password
 */
router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        throw new ValidationError("User ID, current password, and new password are required");
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/reset-password
 */
router.post(
  "/reset-password",
  validateBody(resetPasswordBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        throw new ValidationError("Reset token and new password are required");
      }

      const result = await authService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 */
router.post(
  "/logout",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const authService = new AuthService(db);
      const { userId, token } = req.body;

      if (!userId || !token) {
        throw new ValidationError("User ID and token are required");
      }

      const result = await authService.logout(userId, token);

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
