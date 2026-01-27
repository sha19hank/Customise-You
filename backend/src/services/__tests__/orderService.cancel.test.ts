// backend/src/services/__tests__/orderService.cancel.test.ts
// Tests for order cancellation functionality

import OrderService from '../orderService';
import {
  mockPool,
  mockClient,
  mockTransaction,
  createMockOrder,
  createMockOrderItems,
} from '../../__tests__/setup';

describe('OrderService - Cancel Order', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService(mockPool);
  });

  describe('cancelOrder', () => {
    it('should cancel pending ONLINE order and restore inventory', async () => {
      // Arrange
      const orderId = 'order-123';
      const userId = 'user-123';
      const mockOrder = createMockOrder({ status: 'pending', payment_method: 'online' });
      const mockItems = createMockOrderItems(2);

      mockTransaction([
        { command: 'BEGIN' }, // BEGIN transaction
        { rows: [mockOrder] }, // Get order
        { rows: mockItems }, // Get order items
        { command: 'UPDATE' }, // Restore inventory for item 1
        { command: 'UPDATE' }, // Restore inventory for item 2
        { rows: [{ ...mockOrder, status: 'cancelled' }] }, // Update order status
        { command: 'UPDATE' }, // Update order items status
        { command: 'COMMIT' }, // COMMIT transaction
      ]);

      // Act
      const result = await orderService.cancelOrder(orderId, userId);

      // Assert
      expect(result).toEqual({
        id: orderId,
        orderNumber: mockOrder.order_number,
        status: 'cancelled',
        message: 'Order cancelled successfully',
      });

      // Verify transaction flow
      const queries = mockClient.query as jest.Mock;
      expect(queries).toHaveBeenCalledWith('BEGIN');
      expect(queries).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, userId]
      );
      
      // Verify inventory restoration for each item
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [2, 'product-0']
      );
      expect(queries).toHaveBeenCalledWith(
        'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
        [2, 'product-1']
      );

      // Verify order status update
      expect(queries).toHaveBeenCalledWith(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['cancelled', orderId]
      );

      expect(queries).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should fail to cancel confirmed COD order', async () => {
      // Arrange
      const orderId = 'order-123';
      const userId = 'user-123';
      const mockOrder = createMockOrder({ status: 'confirmed', payment_method: 'cod' });

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [mockOrder] }, // Get order - status is 'confirmed'
      ]);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(
        'Cannot cancel order with status: confirmed'
      );

      // Verify rollback was called
      const queries = mockClient.query as jest.Mock;
      expect(queries).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should fail to cancel expired order', async () => {
      // Arrange
      const orderId = 'order-123';
      const userId = 'user-123';
      const mockOrder = createMockOrder({ status: 'expired' });

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [mockOrder] },
      ]);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(
        'Cannot cancel order with status: expired'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should fail when order not found', async () => {
      // Arrange
      const orderId = 'nonexistent';
      const userId = 'user-123';

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [] }, // No order found
      ]);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(
        'Order not found or unauthorized'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should fail when user does not own the order', async () => {
      // Arrange
      const orderId = 'order-123';
      const userId = 'wrong-user';

      mockTransaction([
        { command: 'BEGIN' },
        { rows: [] }, // No order found for this user
      ]);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(
        'Order not found or unauthorized'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on database error during inventory restoration', async () => {
      // Arrange
      const orderId = 'order-123';
      const userId = 'user-123';
      const mockOrder = createMockOrder({ status: 'pending' });
      const mockItems = createMockOrderItems(1);

      const queryMock = jest.fn()
        .mockResolvedValueOnce({ command: 'BEGIN' })
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockRejectedValueOnce(new Error('Database error')); // Fail on inventory update

      mockClient.query = queryMock;

      // Act & Assert
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow('Database error');

      // Verify rollback
      expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
