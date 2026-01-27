// backend/src/services/paymentService.ts - Payment Processing Service

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

// Validate and initialize Razorpay
const validateRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('[Razorpay] Configuration error: Keys not found in environment');
    console.error('[Razorpay] RAZORPAY_KEY_ID:', keyId ? 'Present' : 'Missing');
    console.error('[Razorpay] RAZORPAY_KEY_SECRET:', keySecret ? 'Present' : 'Missing');
    throw new Error('Razorpay keys not configured in environment. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file');
  }

  console.log('[Razorpay] Configuration validated successfully');
  console.log('[Razorpay] Key ID:', keyId.substring(0, 15) + '...');
  return { keyId, keySecret };
};

const getRazorpayInstance = () => {
  const { keyId, keySecret } = validateRazorpayConfig();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

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

  /**
   * Create Razorpay order
   */
  /**
   * Create Razorpay order for online payment
   * CRITICAL: Amount is ALWAYS fetched from database, NEVER from frontend
   */
  async createRazorpayOrder(orderId: string) {
    console.log('[Razorpay] Creating order for orderId:', orderId);

    try {
      // Validate Razorpay configuration before proceeding
      const { keyId } = validateRazorpayConfig();

      // Fetch order details from database (SINGLE SOURCE OF TRUTH for amount)
      const orderResult = await this.db.query(
        `SELECT id, order_number, total_amount, payment_method, payment_status, status, user_id, seller_id
         FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error('[Razorpay] Order not found:', orderId);
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];
      console.log('[Razorpay] Order details:', {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        status: order.status,
      });

      // Validate order state
      if (order.payment_method !== 'online') {
        console.error('[Razorpay] Invalid payment method:', order.payment_method);
        throw new Error('This order does not require online payment');
      }

      if (order.payment_status === 'paid' || order.payment_status === 'completed') {
        console.error('[Razorpay] Order already paid:', order.payment_status);
        throw new Error('This order has already been paid');
      }

      if (order.status === 'expired' || order.status === 'cancelled') {
        console.error('[Razorpay] Order is', order.status);
        throw new Error(`Cannot create payment for ${order.status} order`);
      }

      // Calculate amount in paise (1 INR = 100 paise)
      const amountInRupees = parseFloat(order.total_amount);
      const amountInPaise = Math.round(amountInRupees * 100);

      console.log('[Razorpay] Amount calculation:', {
        rupees: amountInRupees,
        paise: amountInPaise,
      });

      // Create Razorpay order
      const razorpayOrderOptions = {
        amount: amountInPaise, // Amount in paise (₹100 = 10000 paise)
        currency: 'INR',
        receipt: order.order_number,
        notes: {
          orderId: order.id,
          orderNumber: order.order_number,
        },
      };

      console.log('[Razorpay] Creating Razorpay order with options:', razorpayOrderOptions);

      // Get Razorpay instance and create order
      const razorpayInstance = getRazorpayInstance();
      const razorpayOrder = await razorpayInstance.orders.create(razorpayOrderOptions);

      console.log('[Razorpay] Order created successfully:', {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      });

      // Save razorpay_order_id in database
      await this.db.query(
        'UPDATE orders SET razorpay_order_id = $1 WHERE id = $2',
        [razorpayOrder.id, orderId]
      );

      console.log('[Razorpay] Order ID saved to database');

      return {
        key_id: keyId,
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: order.id,
        order_number: order.order_number,
      };
    } catch (error: unknown) {
      // Comprehensive error logging
      console.error('[Razorpay] Error creating order:', error);

      if (error instanceof Error) {
        console.error('[Razorpay] Error message:', error.message);
        console.error('[Razorpay] Error stack:', error.stack);

        // Log Razorpay-specific error details if available
        const razorpayError = error as any;
        if (razorpayError.error) {
          console.error('[Razorpay] Razorpay error details:', razorpayError.error);
        }
        if (razorpayError.statusCode) {
          console.error('[Razorpay] Status code:', razorpayError.statusCode);
        }

        // Handle specific Razorpay errors
        if (razorpayError.statusCode === 401) {
          throw new Error('Razorpay authentication failed. Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file');
        }
        if (razorpayError.error?.code === 'BAD_REQUEST_ERROR') {
          throw new Error(`Razorpay error: ${razorpayError.error.description || 'Bad request'}`);
        }

        // Return specific error message
        throw new Error(error.message);
      } else {
        console.error('[Razorpay] Unknown error type:', typeof error);
        throw new Error('An unexpected error occurred while creating Razorpay order');
      }
    }
  }

  /**
   * Verify Razorpay payment signature and confirm order
   */
  async verifyRazorpayPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    orderId: string;
  }) {
    console.log('[Razorpay] Verifying payment:', {
      payment_id: paymentData.razorpay_payment_id,
      order_id: paymentData.razorpay_order_id,
      orderId: paymentData.orderId,
    });

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate Razorpay configuration
      const { keySecret } = validateRazorpayConfig();

      // Verify signature
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${paymentData.razorpay_order_id}|${paymentData.razorpay_payment_id}`)
        .digest('hex');

      console.log('[Razorpay] Signature verified successfully');

      if (generatedSignature !== paymentData.razorpay_signature) {
        console.error('[Razorpay] Signature mismatch - payment verification failed');
        throw new Error('Payment verification failed: Invalid signature');
      }

      // Get order details
      const orderResult = await client.query(
        `SELECT id, seller_id, user_id, total_amount, payment_method, razorpay_order_id
         FROM orders WHERE id = $1`,
        [paymentData.orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error('[Razorpay] Order not found:', paymentData.orderId);
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Verify razorpay_order_id matches
      if (order.razorpay_order_id !== paymentData.razorpay_order_id) {
        throw new Error('Order ID mismatch');
      }

      // Calculate fees and earnings
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

      // Create transaction record
      await client.query(
        `INSERT INTO transactions (
          id, transaction_id, order_id, payer_id, payee_id,
          amount, currency, payment_method, payment_status,
          payment_gateway_reference, platform_fee, processing_fee,
          net_amount, refund_status, gross_amount, platform_fee_amount,
          seller_earning_amount, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
        [
          uuidv4(),
          paymentData.razorpay_payment_id,
          paymentData.orderId,
          order.user_id,
          order.seller_id,
          grossAmount,
          'INR',
          'razorpay',
          'completed',
          paymentData.razorpay_payment_id,
          platformFeeAmount,
          0,
          sellerEarningAmount,
          'none',
          grossAmount,
          platformFeeAmount,
          sellerEarningAmount,
        ]
      );

      // Update order status to confirmed and payment as paid
      await client.query(
        `UPDATE orders 
         SET status = $1, payment_status = $2, payment_id = $3, confirmed_at = NOW(), platform_fee = $4
         WHERE id = $5`,
        ['confirmed', 'paid', paymentData.razorpay_payment_id, platformFeeAmount, paymentData.orderId]
      );

      // Reduce inventory for ONLINE orders (now that payment is successful)
      const orderItemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [paymentData.orderId]
      );

      for (const item of orderItemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_available = quantity_available - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

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

      console.log('[Razorpay] Payment verification completed successfully:', {
        orderId: paymentData.orderId,
        paymentId: paymentData.razorpay_payment_id,
      });

      return {
        success: true,
        message: 'Payment verified and order confirmed',
        orderId: paymentData.orderId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Razorpay] Payment verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    } finally {
      client.release();
    }
  }

  /**
   * Handle Razorpay webhook
   */
  async handleRazorpayWebhook(webhookBody: any, webhookSignature: string) {
    try {
      // Verify webhook signature
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookBody))
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        throw new Error('Invalid webhook signature');
      }

      const event = webhookBody.event;
      const paymentEntity = webhookBody.payload.payment.entity;

      // Handle payment.captured event
      if (event === 'payment.captured') {
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;

        // Find order by razorpay_order_id
        const orderResult = await this.db.query(
          'SELECT id FROM orders WHERE razorpay_order_id = $1',
          [razorpayOrderId]
        );

        if (orderResult.rows.length > 0) {
          const orderId = orderResult.rows[0].id;

          // Verify payment if not already done
          await this.verifyRazorpayPayment({
            razorpay_payment_id: razorpayPaymentId,
            razorpay_order_id: razorpayOrderId,
            razorpay_signature: '', // Webhook doesn't provide signature
            orderId,
          });
        }
      }

      // Handle payment.failed event
      if (event === 'payment.failed') {
        const razorpayOrderId = paymentEntity.order_id;

        const orderResult = await this.db.query(
          'SELECT id FROM orders WHERE razorpay_order_id = $1',
          [razorpayOrderId]
        );

        if (orderResult.rows.length > 0) {
          const orderId = orderResult.rows[0].id;

          // Update payment status to failed
          await this.db.query(
            'UPDATE orders SET payment_status = $1 WHERE id = $2',
            ['failed', orderId]
          );
        }
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Webhook handling failed: ${errorMessage}`);
    }
  }
}

export default PaymentService;
