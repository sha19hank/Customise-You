// backend/src/services/chatService.ts - Chat & Messaging Service

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface SendMessageRequest {
  senderId: string;
  recipientId: string;
  messageType: 'text' | 'image' | 'file';
  content: string;
  orderId?: string;
  productId?: string;
}

class ChatService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Get user's conversations
   */
  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const result = await this.db.query(
        `SELECT DISTINCT ON (conversation_id)
          m.id, m.sender_id, m.recipient_id, m.content, m.created_at,
          m.is_read, m.order_id, m.product_id,
          CASE 
            WHEN m.sender_id = $1 THEN m.recipient_id 
            ELSE m.sender_id 
          END as conversation_with_id,
          u.first_name || ' ' || u.last_name as conversation_with_name,
          u.profile_image_url,
          (SELECT COUNT(*) FROM messages 
           WHERE recipient_id = $1 AND sender_id = conversation_with_id AND is_read = false) as unread_count
         FROM messages m
         JOIN users u ON (
           CASE 
             WHEN m.sender_id = $1 THEN u.id = m.recipient_id 
             ELSE u.id = m.sender_id 
           END
         )
         WHERE m.sender_id = $1 OR m.recipient_id = $1
         ORDER BY conversation_id, m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return {
        data: result.rows,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch conversations: ${errorMessage}`);
    }
  }

  /**
   * Get messages with a specific user
   */
  async getMessages(userId: string, otherUserId: string, page: number = 1, limit: number = 50) {
    try {
      const offset = (page - 1) * limit;

      const result = await this.db.query(
        `SELECT m.*, 
                u.first_name, u.last_name, u.profile_image_url
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE (m.sender_id = $1 AND m.recipient_id = $2)
            OR (m.sender_id = $2 AND m.recipient_id = $1)
         ORDER BY m.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, otherUserId, limit, offset]
      );

      return {
        data: result.rows.reverse(), // Oldest first
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch messages: ${errorMessage}`);
    }
  }

  /**
   * Send a message
   */
  async sendMessage(messageData: SendMessageRequest) {
    try {
      const messageId = uuidv4();

      const result = await this.db.query(
        `INSERT INTO messages (
          id, sender_id, recipient_id, message_type, content,
          order_id, product_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          messageId,
          messageData.senderId,
          messageData.recipientId,
          messageData.messageType,
          messageData.content,
          messageData.orderId,
          messageData.productId,
          false,
        ]
      );

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, otherUserId: string) {
    try {
      const result = await this.db.query(
        `UPDATE messages 
         SET is_read = true 
         WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false
         RETURNING id`,
        [userId, otherUserId]
      );

      return {
        success: true,
        markedCount: result.rowCount || 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to mark messages as read: ${errorMessage}`);
    }
  }
}

export default ChatService;
