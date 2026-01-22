// backend/src/services/orderService.ts - Order Management Service

import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

export interface CreateOrderRequest {
  userId: string;
  cartItems: Array<{
    productId: string;
    quantity: number;
    customizations: Record<string, any>;
  }>;
  shippingAddressId: string;
  billingAddressId?: string;
  shippingMethod: string;
  paymentMethod: string;
  couponCode?: string;
}

export interface OrderUpdateRequest {
  status?: string;
  trackingNumber?: string;
  notes?: string;
}

class OrderService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderRequest) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      // Calculate order totals
      let subtotal = 0;
      const items = [];

      for (const item of orderData.cartItems) {
        // Get product details
        const productResult = await client.query(
          'SELECT id, seller_id, base_price, final_price FROM products WHERE id = $1',
          [item.productId]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const product = productResult.rows[0];
        const itemPrice = product.final_price * item.quantity;
        subtotal += itemPrice;

        items.push({
          productId: product.id,
          sellerId: product.seller_id,
          quantity: item.quantity,
          unitPrice: product.final_price,
          subtotal: itemPrice,
          customizations: item.customizations,
        });
      }

      // Calculate taxes and fees
      const tax = subtotal * 0.1; // 10% tax
      const platformFee = subtotal * 0.02; // 2% platform fee
      const shippingCost = 5; // Fixed shipping for now
      const totalAmount = subtotal + tax + platformFee + shippingCost;

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          id, order_number, user_id, seller_id, status, subtotal, tax_amount, 
          shipping_cost, platform_fee, total_amount, shipping_address_id, 
          billing_address_id, payment_method, payment_status, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          orderId,
          orderNumber,
          orderData.userId,
          items[0].sellerId, // Use first seller ID
          'pending',
          subtotal,
          tax,
          shippingCost,
          platformFee,
          totalAmount,
          orderData.shippingAddressId,
          orderData.billingAddressId || orderData.shippingAddressId,
          orderData.paymentMethod,
          'pending',
          'USD'
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        const orderItemId = uuidv4();
        await client.query(
          `INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orderItemId,
            orderId,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.subtotal
          ]
        );

        // Store customization details
        for (const [key, value] of Object.entries(item.customizations)) {
          const customizationId = uuidv4();
          await client.query(
            `INSERT INTO order_customizations (
              id, order_item_id, customization_id, customization_value
            ) VALUES ($1, $2, $3, $4)`,
            [customizationId, orderItemId, key, JSON.stringify(value)]
          );
        }
      }

      // Update product inventory
      for (const item of items) {
        await client.query(
          'UPDATE products SET quantity_available = quantity_available - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      await client.query('COMMIT');

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        items: items.length,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
      };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Order creation failed: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const countResult = await this.db.query(
        'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
        [userId]
      );

      const ordersResult = await this.db.query(
        `SELECT id, order_number, status, total_amount, payment_status, 
                created_at, estimated_delivery_date, tracking_number
         FROM orders WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return {
        data: ordersResult.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch orders: ${errorMessage}`);
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    try {
      // Get order
      const orderResult = await this.db.query(
        `SELECT * FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsResult = await this.db.query(
        `SELECT oi.*, p.name as product_name, p.main_image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      // Get customizations for each item
      const items = await Promise.all(
        itemsResult.rows.map(async (item: any) => {
          const customResult = await this.db.query(
            'SELECT * FROM order_customizations WHERE order_item_id = $1',
            [item.id]
          );

          return {
            ...item,
            customizations: customResult.rows,
          };
        })
      );

      // Get shipping address
      const addressResult = await this.db.query(
        'SELECT * FROM addresses WHERE id = $1',
        [order.shipping_address_id]
      );

      return {
        ...order,
        items,
        shippingAddress: addressResult.rows[0] || null,
        timeline: [
          { status: 'pending', timestamp: order.created_at },
          ...(order.confirmed_at ? [{ status: 'confirmed', timestamp: order.confirmed_at }] : []),
          ...(order.shipped_at ? [{ status: 'shipped', timestamp: order.shipped_at }] : []),
          ...(order.delivered_at ? [{ status: 'delivered', timestamp: order.delivered_at }] : []),
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch order details: ${errorMessage}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, updateData: OrderUpdateRequest) {
    try {
      const { status, trackingNumber, notes } = updateData;

      const updateFields = ['updated_at = NOW()'];
      const values = [orderId];
      let paramCount = 2;

      if (status) {
        updateFields.push(`status = $${paramCount}`, `${status}_at = NOW()`);
        values.push(status);
        paramCount++;
      }

      if (trackingNumber) {
        updateFields.push(`tracking_number = $${paramCount}`);
        values.push(trackingNumber);
        paramCount++;
      }

      const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update order status: ${errorMessage}`);
    }
  }

  /**
   * Get seller's orders
   */
  async getSellerOrders(sellerId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const countResult = await this.db.query(
        'SELECT COUNT(*) as total FROM orders WHERE seller_id = $1',
        [sellerId]
      );

      const ordersResult = await this.db.query(
        `SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
                u.first_name, u.last_name, u.email
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.seller_id = $1
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      );

      return {
        data: ordersResult.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch seller orders: ${errorMessage}`);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get order
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Can only cancel pending orders
      if (order.status !== 'pending' && order.status !== 'confirmed') {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['cancelled', orderId]
      );

      // Restore inventory
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Order cancelled successfully',
        refundInitiated: true,
        estimatedRefundDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to cancel order: ${errorMessage}`);
    } finally {
      client.release();
    }
  }
}

export default OrderService;
