// backend/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from './errorHandler';

export type UserRole = 'user' | 'seller' | 'admin';

interface JwtPayload {
  userId?: string;
  email?: string;
  role?: string;
  sub?: string;
}

const normalizeRole = (role?: string): UserRole => {
  if (role === 'seller') return 'seller';
  if (role === 'admin') return 'admin';
  return 'user';
};

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const altToken = req.headers['x-access-token'];
  if (typeof altToken === 'string' && altToken.trim()) {
    return altToken.trim();
  }

  return null;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      throw new AuthenticationError('Invalid token payload');
    }

    const role = normalizeRole(decoded.role);

    req.user = {
      userId,
      email: decoded.email || '',
      role,
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    return next(new AuthenticationError('Invalid or expired token'));
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    return next();
  };
};
