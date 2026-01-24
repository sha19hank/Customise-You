// backend/src/services/paymentService.ts - Payment Processing Service

import { Pool } from 'pg';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'razorpay' | 'paypal' | 'cod';
  paymentMethodId?: string;
}

class PaymentService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Create payment intent (Stripe)
   */
  async createPaymentIntent(paymentData: CreatePaymentRequest) {
    try {
      // Get order details
      const orderResult = await this.db.query(
        'SELECT * FROM orders WHERE id = $1',
        [paymentData.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      if (paymentData.paymentMethod === 'stripe') {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(paymentData.amount * 100), // Convert to cents
          currency: paymentData.currency.toLowerCase(),
          metadata: {
            orderId: paymentData.orderId,
            orderNumber: order.order_number,
          },
        });

        // Save transaction
        await this.db.query(
          `INSERT INTO transactions (
            order_id, amount, currency, payment_method, 
            payment_provider, provider_transaction_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            paymentData.orderId,
            paymentData.amount,
            paymentData.currency,
            paymentData.paymentMethod,
            'stripe',
            paymentIntent.id,
            'pending',
          ]
        );

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      }

      // For other payment methods (Razorpay, PayPal, COD)
      return {
        message: 'Payment method not fully implemented yet',
        orderId: paymentData.orderId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create payment intent: ${errorMessage}`);
    }
  }

  /**
   * Confirm payment
   */
  async confirmPayment(orderId: string, transactionId: string) {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Update transaction status
        await client.query(
          `UPDATE transactions 
           SET status = $1, completed_at = NOW() 
           WHERE provider_transaction_id = $2`,
          ['completed', transactionId]
        );

        // Update order payment status
        await client.query(
          `UPDATE orders 
           SET payment_status = $1, confirmed_at = NOW(), status = $2
           WHERE id = $3`,
          ['paid', 'confirmed', orderId]
        );

        await client.query('COMMIT');

        return {
          success: true,
          message: 'Payment confirmed successfully',
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to confirm payment: ${errorMessage}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(orderId: string) {
    try {
      const result = await this.db.query(
        `SELECT t.*, o.order_number, o.total_amount 
         FROM transactions t
         JOIN orders o ON t.order_id = o.id
         WHERE t.order_id = $1
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [orderId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch payment status: ${errorMessage}`);
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: string, amount: number, reason: string) {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Get original transaction
        const transactionResult = await client.query(
          `SELECT * FROM transactions 
           WHERE order_id = $1 AND status = 'completed'
           ORDER BY created_at DESC LIMIT 1`,
          [orderId]
        );

        if (transactionResult.rows.length === 0) {
          throw new Error('No completed transaction found for this order');
        }

        const transaction = transactionResult.rows[0];

        // Process Stripe refund
        if (transaction.payment_provider === 'stripe') {
          const refund = await stripe.refunds.create({
            payment_intent: transaction.provider_transaction_id,
            amount: Math.round(amount * 100),
            reason: 'requested_by_customer',
          });

          // Record refund
          await client.query(
            `INSERT INTO transactions (
              order_id, amount, currency, payment_method, 
              payment_provider, provider_transaction_id, 
              transaction_type, status, refund_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              orderId,
              amount,
              transaction.currency,
              transaction.payment_method,
              'stripe',
              refund.id,
              'refund',
              'completed',
              reason,
            ]
          );
        }

        // Update order status
        await client.query(
          `UPDATE orders 
           SET payment_status = $1, status = $2 
           WHERE id = $3`,
          ['refunded', 'cancelled', orderId]
        );

        await client.query('COMMIT');

        return {
          success: true,
          message: 'Refund processed successfully',
          refundAmount: amount,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process refund: ${errorMessage}`);
    }
  }
}

export default PaymentService;
