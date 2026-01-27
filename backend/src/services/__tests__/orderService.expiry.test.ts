// backend/src/services/__tests__/orderService.expiry.test.ts
// Tests for order expiry functionality

import OrderService from '../orderService';
import {
  mockPool,
  mockClient,
  mockTransaction,
  createMockOrder,
  createMockOrderItems,
} from '../../__tests__/setup';

describe('OrderService - Order Expiry', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService(mockPool);
  });

  describe('expireOrders', () => {
    it('should expire pending ONLINE orders older than TTL and restore inventory', async () => {
      // Arrange
      const expiryMinutes = 30;
      const oldDate = new Date(Date.now() - 40 * 60 * 1000); // 40 minutes ago
      
      const expiredOrder1 = createMockOrder({
        id: 'order-1',
        order_number: 'ORD-001',
        status: 'pending',
        payment_method: 'online',
        created_at: oldDate,
      });
      
      const expiredOrder2 = createMockOrder({
        id: 'order-2',
        order_number: 'ORD-002',
        status: 'pending',
        payment_method: 'online',
        created_at: oldDate,
      });

      const items1 = [{ id: 'item-1', order_id: 'order-1', product_id: 'product-1', quantity: 2 }];
      const items2 = [{ id: 'item-2', order_id: 'order-2', product_id: 'product-2', quantity: 3 }];

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [expiredOrder1, expiredOrder2] }, // Find expired orders
        { rows: items1 }, // Get items for order-1
        { command: 'UPDATE' }, // Restore inventory for order-1
        { command: 'UPDATE' }, // Update order-1 status
        { command: 'UPDATE' }, // Update order-1 items
        { rows: items2 }, // Get items for order-2
        { command: 'UPDATE' }, // Restore inventory for order-2
        { command: 'UPDATE' }, // Update order-2 status
        { command: 'UPDATE' }, // Update order-2 items
        { command: 'COMMIT' },
      ]);

      // Act
      const result = await orderService.expireOrders(expiryMinutes);

      // Assert
      expect(result).toEqual({
        expiredCount: 2,
        message: '2 order(s) expired and inventory restored',
      });

      const queries = mockClient.query as jest.Mock;
      
      // Verify expired orders query
      expect(queries).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'pending'")
      );
      expect(queries).toHaveBeenCalledWith(
        expect.stringContaining("AND payment_method = 'online'")
      );
      expect(queries).toHaveBeenCalledWith(
        expect.stringContaining(`INTERVAL '${expiryMinutes} minutes'`)
      );

      // Verify inventory restoration
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [2, 'product-1']
      );
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [3, 'product-2']
      );

      // Verify order status updates
      expect(queries).toHaveBeenCalledWith(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['expired', 'order-1']
      );
      expect(queries).toHaveBeenCalledWith(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['expired', 'order-2']
      );

      expect(queries).toHaveBeenCalledWith('COMMIT');
    });

    it('should not expire COD orders', async () => {
      // Arrange
      const expiryMinutes = 30;

      // Return empty array - no pending ONLINE orders found
      mockTransaction([
        { command: 'BEGIN' },
        { rows: [] }, // No expired orders
        { command: 'COMMIT' },
      ]);

      // Act
      const result = await orderService.expireOrders(expiryMinutes);

      // Assert
      expect(result.expiredCount).toBe(0);
      
      const queries = mockClient.query as jest.Mock;
      
      // Verify query filters for ONLINE payment method
      expect(queries).toHaveBeenCalledWith(
        expect.stringContaining("payment_method = 'online'")
      );
    });

    it('should handle custom expiry TTL', async () => {
      // Arrange
      const customExpiryMinutes = 15;

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [] },
        { command: 'COMMIT' },
      ]);

      // Act
      await orderService.expireOrders(customExpiryMinutes);

      // Assert
      const queries = mockClient.query as jest.Mock;
      expect(queries).toHaveBeenCalledWith(
        expect.stringContaining(`INTERVAL '${customExpiryMinutes} minutes'`)
      );
    });

    it('should rollback on error during expiry process', async () => {
      // Arrange
      const expiryMinutes = 30;
      const expiredOrder = createMockOrder({
        id: 'order-1',
        status: 'pending',
        payment_method: 'online',
      });

      const queryMock = jest.fn()
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [expiredOrder] })
        .mockRejectedValueOnce(new Error('Database error'));

      mockClient.query = queryMock;

      // Act & Assert
      await expect(orderService.expireOrders(expiryMinutes)).rejects.toThrow('Database error');

      expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle no expired orders gracefully', async () => {
      // Arrange
      const expiryMinutes = 30;

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [] }, // No expired orders
        { command: 'COMMIT' },
      ]);

      // Act
      const result = await orderService.expireOrders(expiryMinutes);

      // Assert
      expect(result).toEqual({
        expiredCount: 0,
        message: '0 order(s) expired and inventory restored',
      });

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should expire multiple items in single order correctly', async () => {
      // Arrange
      const expiryMinutes = 30;
      const expiredOrder = createMockOrder({
        id: 'order-1',
        status: 'pending',
        payment_method: 'online',
      });

      const multipleItems = [
        { id: 'item-1', product_id: 'product-1', quantity: 2 },
        { id: 'item-2', product_id: 'product-2', quantity: 5 },
        { id: 'item-3', product_id: 'product-3', quantity: 1 },
      ];

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [expiredOrder] },
        { rows: multipleItems },
        { command: 'UPDATE' }, // Restore product-1
        { command: 'UPDATE' }, // Restore product-2
        { command: 'UPDATE' }, // Restore product-3
        { command: 'UPDATE' }, // Update order status
        { command: 'UPDATE' }, // Update order items
        { command: 'COMMIT' },
      ]);

      // Act
      const result = await orderService.expireOrders(expiryMinutes);

      // Assert
      expect(result.expiredCount).toBe(1);

      const queries = mockClient.query as jest.Mock;
      
      // Verify all items had inventory restored
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [2, 'product-1']
      );
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [5, 'product-2']
      );
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [1, 'product-3']
      );
    });
  });
});
