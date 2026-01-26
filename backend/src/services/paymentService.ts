// backend/src/services/paymentService.ts - Payment Processing Service

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
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
      // ============================================================
      // LEGAL COMPLIANCE: PREPAID-ONLY PAYMENT ENFORCEMENT
      // ============================================================
      // Cash on Delivery (COD) is NOT supported yet
      // All orders must be prepaid via platform payment gateway
      // This is a safety guard to ensure legal and financial compliance
      if (paymentData.paymentMethod === 'cod') {
        throw new Error(
          'Cash on Delivery (COD) is not supported at this time. ' +
          'Please use a prepaid payment method (Stripe, Razorpay, or PayPal).'
        );
      }
      // ============================================================

      // Get order details
      const orderResult = await this.db.query(
        'SELECT * FROM orders WHERE id = $1',
        [paymentData.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];
      const transactionId = uuidv4();
      const platformFee = 0;
      const processingFee = 0;
      const netAmount = paymentData.amount - platformFee - processingFee;

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
            id, transaction_id, order_id, payer_id, payee_id,
            amount, currency, payment_method, payment_status,
            payment_gateway_reference, platform_fee, processing_fee,
            net_amount, refund_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            uuidv4(),
            transactionId,
            paymentData.orderId,
            order.user_id,
            order.seller_id,
            paymentData.amount,
            paymentData.currency,
            paymentData.paymentMethod,
            'pending',
            paymentIntent.id,
            platformFee,
            processingFee,
            netAmount,
            'none',
          ]
        );

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          transactionId,
        };
      }

      // For other payment methods (Razorpay, PayPal, COD)
      await this.db.query(
        `INSERT INTO transactions (
          id, transaction_id, order_id, payer_id, payee_id,
          amount, currency, payment_method, payment_status,
          payment_gateway_reference, platform_fee, processing_fee,
          net_amount, refund_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          uuidv4(),
          transactionId,
          paymentData.orderId,
          order.user_id,
          order.seller_id,
          paymentData.amount,
          paymentData.currency,
          paymentData.paymentMethod,
          'pending',
          null,
          platformFee,
          processingFee,
          netAmount,
          'none',
        ]
      );

      return {
        message: 'Payment method not fully implemented yet',
        orderId: paymentData.orderId,
        transactionId,
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

        const orderResult = await client.query(
          'SELECT id, seller_id, user_id, total_amount FROM orders WHERE id = $1',
          [orderId]
        );

        if (orderResult.rows.length === 0) {
          throw new Error('Order not found');
        }

        const order = orderResult.rows[0];

        const completedCountResult = await client.query(
          `SELECT COUNT(*) as count FROM orders WHERE seller_id = $1 AND status = 'completed'`,
          [order.seller_id]
        );

        const completedCount = parseInt(completedCountResult.rows[0].count, 10);
        const completedAfter = completedCount + 1;

        let commissionRate = 0;
        if (completedAfter >= 11 && completedAfter <= 50) {
          commissionRate = 0.03;
        } else if (completedAfter >= 51) {
          commissionRate = 0.07;
        }

        const grossAmount = parseFloat(order.total_amount);
        const platformFeeAmount = parseFloat((grossAmount * commissionRate).toFixed(2));
        const sellerEarningAmount = parseFloat((grossAmount - platformFeeAmount).toFixed(2));

        // Update transaction status + monetization fields
        await client.query(
          `UPDATE transactions 
           SET payment_status = $1,
               gross_amount = $2,
               platform_fee_amount = $3,
               seller_earning_amount = $4,
               completed_at = NOW()
           WHERE payment_gateway_reference = $5 OR transaction_id = $5`,
          ['completed', grossAmount, platformFeeAmount, sellerEarningAmount, transactionId]
        );

        // Update order payment status + commission
        await client.query(
          `UPDATE orders 
           SET payment_status = $1, confirmed_at = NOW(), status = $2, platform_fee = $3
           WHERE id = $4`,
          ['completed', 'completed', platformFeeAmount, orderId]
        );

        // Assign seller badges based on completed order milestones
        const sellerResult = await client.query('SELECT badges FROM sellers WHERE id = $1', [order.seller_id]);
        const existingBadges = sellerResult.rows[0]?.badges || [];
        const badgeSet = new Set<string>(existingBadges);

        if (completedAfter === 1) badgeSet.add('FIRST_ORDER');
        if (completedAfter === 10) badgeSet.add('FIRST_10_ORDERS');
        if (completedAfter === 50) badgeSet.add('FIRST_50_ORDERS');

        await client.query(
          'UPDATE sellers SET badges = $1 WHERE id = $2',
          [JSON.stringify(Array.from(badgeSet)), order.seller_id]
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
           WHERE order_id = $1 AND payment_status = 'completed'
           ORDER BY created_at DESC LIMIT 1`,
          [orderId]
        );

        if (transactionResult.rows.length === 0) {
          throw new Error('No completed transaction found for this order');
        }

        const transaction = transactionResult.rows[0];

        // Process Stripe refund
        if (transaction.payment_method === 'stripe' && transaction.payment_gateway_reference) {
          const refund = await stripe.refunds.create({
            payment_intent: transaction.payment_gateway_reference,
            amount: Math.round(amount * 100),
            reason: 'requested_by_customer',
          });

          // Record refund
          await client.query(
            `INSERT INTO transactions (
              id, transaction_id, order_id, payer_id, payee_id,
              amount, currency, payment_method, payment_status,
              payment_gateway_reference, platform_fee, processing_fee,
              net_amount, refund_status, refund_amount, refund_reason, refund_processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              uuidv4(),
              uuidv4(),
              orderId,
              transaction.payer_id,
              transaction.payee_id,
              amount,
              transaction.currency,
              transaction.payment_method,
              'refunded',
              refund.id,
              0,
              0,
              amount,
              'full',
              amount,
              reason,
              new Date(),
            ]
          );
        }

        // Update order status
        await client.query(
          `UPDATE orders 
           SET payment_status = $1, status = $2 
           WHERE id = $3`,
          ['refunded', 'refunded', orderId]
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
