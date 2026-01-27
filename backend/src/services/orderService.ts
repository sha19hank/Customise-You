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

export interface CreateOrderIntentRequest {
  userId: string;
  cartItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    customizations: Array<{
      customizationId: string;
      label: string;
      value: string;
      priceAdjustment: number;
    }>;
  }>;
  addressId: string;
  paymentMethod: 'COD' | 'ONLINE';
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
   * Create order intent (Myntra-style)
   * - COD orders: status = CONFIRMED, no payment required
   * - ONLINE orders: status = PENDING_PAYMENT, payment required
   */
  async createOrderIntent(orderData: CreateOrderIntentRequest) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      // Calculate order totals from cart items (already calculated in frontend)
      let subtotal = 0;
      const itemsToCreate = [];

      for (const item of orderData.cartItems) {
        // Calculate item total (base price + customization adjustments)
        const customizationTotal = item.customizations.reduce(
          (sum, custom) => sum + custom.priceAdjustment,
          0
        );
        const itemPrice = (item.price + customizationTotal) * item.quantity;
        subtotal += itemPrice;

        // Verify product exists and get seller
        const productResult = await client.query(
          'SELECT id, seller_id, quantity_available FROM products WHERE id = $1',
          [item.productId]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const product = productResult.rows[0];

        // Check stock availability
        if (product.quantity_available < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        itemsToCreate.push({
          productId: product.id,
          sellerId: product.seller_id,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: itemPrice,
          customizations: item.customizations,
        });
      }

      // Calculate additional charges
      const tax = subtotal * 0.18; // 18% GST
      const shippingCost = 0; // Free shipping
      const platformFee = subtotal * 0.02; // 2% platform fee
      const totalAmount = subtotal + tax + shippingCost + platformFee;

      // Determine order status based on payment method
      const orderStatus = orderData.paymentMethod === 'COD' ? 'confirmed' : 'pending';
      const paymentStatus = orderData.paymentMethod === 'COD' ? 'pending' : 'pending';

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
          itemsToCreate[0].sellerId, // Use first seller ID
          orderStatus,
          subtotal,
          tax,
          shippingCost,
          platformFee,
          totalAmount,
          orderData.addressId,
          orderData.addressId, // Use same for billing
          orderData.paymentMethod.toLowerCase(),
          paymentStatus,
          'INR',
        ]
      );

      // Create order items
      for (const item of itemsToCreate) {
        const itemId = uuidv4();
        
        // Order items always start as 'pending' regardless of order status
        // Valid order_item_status values: pending, processing, shipped, delivered, cancelled
        await client.query(
          `INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price, subtotal, item_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            itemId,
            orderId,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.subtotal,
            'pending',
          ]
        );

        // Create customizations for this item
        for (const custom of item.customizations) {
          await client.query(
            `INSERT INTO order_customizations (
              id, order_item_id, customization_id, customization_value, price_adjustment
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              uuidv4(),
              itemId,
              custom.customizationId,
              custom.value,
              custom.priceAdjustment,
            ]
          );
        }

        // For COD orders, reduce inventory immediately
        if (orderData.paymentMethod === 'COD') {
          await client.query(
            'UPDATE products SET quantity_available = quantity_available - $1 WHERE id = $2',
            [item.quantity, item.productId]
          );
        }
      }

      await client.query('COMMIT');

      return {
        orderId: orderResult.rows[0].id,
        orderNumber: orderResult.rows[0].order_number,
        amount: totalAmount,
        paymentRequired: orderData.paymentMethod === 'ONLINE',
        paymentMethod: orderData.paymentMethod,
        status: orderStatus,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

      const isUuid = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
          if (!isUuid(key)) {
            continue;
          }
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
        `SELECT 
          o.id, 
          o.order_number, 
          o.status, 
          o.total_amount, 
          o.payment_method,
          o.payment_status, 
          o.created_at, 
          o.estimated_delivery_date, 
          o.tracking_number,
          COUNT(oi.id)::int as item_count
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_id = $1 
         GROUP BY o.id, o.order_number, o.status, o.total_amount, o.payment_method, 
                  o.payment_status, o.created_at, o.estimated_delivery_date, o.tracking_number
         ORDER BY o.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return {
        orders: ordersResult.rows,
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
   * Cancel order (only pending orders)
   * Restores inventory for all items
   */
  async cancelOrder(orderId: string, userId: string) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get order details
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or unauthorized');
      }

      const order = orderResult.rows[0];

      // Only allow cancellation of pending orders
      if (order.status !== 'pending') {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Get order items to restore inventory
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      // Restore inventory for each item
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      const updateResult = await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['cancelled', orderId]
      );

      // Update order items status
      await client.query(
        'UPDATE order_items SET item_status = $1 WHERE order_id = $2',
        ['cancelled', orderId]
      );

      await client.query('COMMIT');

      return {
        id: updateResult.rows[0].id,
        orderNumber: updateResult.rows[0].order_number,
        status: updateResult.rows[0].status,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark expired orders and restore inventory
   * Called by background job
   */
  async expireOrders(expiryMinutes: number = 30) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Find expired pending orders
      const expiredResult = await client.query(
        `SELECT id FROM orders 
         WHERE status = 'pending' 
         AND payment_method = 'online'
         AND created_at < NOW() - INTERVAL '${expiryMinutes} minutes'`
      );

      const expiredCount = expiredResult.rows.length;

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
      }

      await client.query('COMMIT');

      return {
        expiredCount,
        message: `${expiredCount} order(s) expired and inventory restored`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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

      // Calculate lifecycle metadata
      const EXPIRY_MINUTES = 30;
      const canCancel = order.status === 'pending';
      
      let expiresAt = null;
      if (order.status === 'pending' && order.payment_method === 'online') {
        const createdAt = new Date(order.created_at);
        expiresAt = new Date(createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
      }

      return {
        ...order,
        items,
        shipping_address: addressResult.rows[0] || null,
        can_cancel: canCancel,
        expires_at: expiresAt,
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
}

export default OrderService;

