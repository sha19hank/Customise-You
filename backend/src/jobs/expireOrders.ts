// backend/src/jobs/expireOrders.ts - Background job to expire pending orders

import { Pool } from 'pg';
import { getDatabase } from '../config/database';

/**
 * Expire pending ONLINE orders that are older than specified minutes
 * This script should be run periodically (e.g., every 5 minutes via cron)
 * 
 * Usage:
 * node dist/jobs/expireOrders.js [expiryMinutes]
 * 
 * Example:
 * node dist/jobs/expireOrders.js 30
 */

const EXPIRY_MINUTES = parseInt(process.argv[2]) || 30;

async function expireOrders() {
  let db: Pool | null = null;
  
  try {
    console.log(`[Expiry Job] Starting order expiry check (${EXPIRY_MINUTES} minutes TTL)...`);
    
    db = await getDatabase();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Find expired pending orders
      const expiredResult = await client.query(
        `SELECT id, order_number FROM orders 
         WHERE status = 'pending' 
         AND payment_method = 'online'
         AND created_at < NOW() - INTERVAL '${EXPIRY_MINUTES} minutes'`
      );

      const expiredCount = expiredResult.rows.length;

      if (expiredCount === 0) {
        console.log('[Expiry Job] No expired orders found.');
        await client.query('COMMIT');
        return;
      }

      console.log(`[Expiry Job] Found ${expiredCount} expired order(s). Processing...`);

      for (const order of expiredResult.rows) {
        // Get order items to restore inventory
        const itemsResult = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [order.id]
        );

        // Restore inventory
        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }

        // Mark order as expired
        await client.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
          ['expired', order.id]
        );

        // Update order items
        await client.query(
          'UPDATE order_items SET item_status = $1 WHERE order_id = $2',
          ['expired', order.id]
        );

        console.log(`[Expiry Job] Expired order: ${order.order_number} (ID: ${order.id})`);
      }

      await client.query('COMMIT');
      console.log(`[Expiry Job] Successfully expired ${expiredCount} order(s) and restored inventory.`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('[Expiry Job] Error:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
  
  process.exit(0);
}

// Run the job
expireOrders();
