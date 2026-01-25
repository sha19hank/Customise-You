// backend/src/types/express.d.ts

import { UserRole } from '../middleware/authMiddleware';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
