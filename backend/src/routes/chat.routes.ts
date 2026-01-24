// backend/src/routes/chat.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import ChatService from '../services/chatService';
import { ValidationError } from '../middleware/errorHandler';
import { pool } from '../config/database';

const router = Router();
const chatService = new ChatService(pool);

/**
 * GET /messages - Get user's conversations
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const conversations = await chatService.getConversations(userId, page, limit);

      res.status(200).json({
        success: true,
        data: conversations.data,
        pagination: {
          page: conversations.page,
          limit: conversations.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /messages/:userId - Get messages with specific user
 */
router.get(
  '/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.query.currentUserId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId || !currentUserId) {
        throw new ValidationError('Both user IDs are required');
      }

      const messages = await chatService.getMessages(currentUserId, userId, page, limit);

      res.status(200).json({
        success: true,
        data: messages.data,
        pagination: {
          page: messages.page,
          limit: messages.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /messages - Send a message
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { senderId, recipientId, messageType, content, orderId, productId } = req.body;

      if (!senderId || !recipientId || !content) {
        throw new ValidationError('Sender ID, recipient ID, and content are required');
      }

      const message = await chatService.sendMessage({
        senderId,
        recipientId,
        messageType: messageType || 'text',
        content,
        orderId,
        productId,
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /messages/mark-read - Mark messages as read
 */
router.post(
  '/mark-read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, otherUserId } = req.body;

      if (!userId || !otherUserId) {
        throw new ValidationError('Both user IDs are required');
      }

      const result = await chatService.markAsRead(userId, otherUserId);

      res.status(200).json({
        success: true,
        message: `${result.markedCount} messages marked as read`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
