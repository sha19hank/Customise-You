// backend/src/routes/auth.routes.ts

import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { ValidationError } from "../middleware/errorHandler";

const router = Router();

/**
 * POST /auth/register
 */
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, phone } = req.body;

      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const user = await AuthService.register({
        email,
        password,
        phone,
      });

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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const result = await AuthService.login({ email, password });

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

export default router;
