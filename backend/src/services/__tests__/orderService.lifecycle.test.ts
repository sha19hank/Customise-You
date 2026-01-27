// backend/src/services/__tests__/orderService.lifecycle.test.ts
// Tests for order lifecycle metadata (can_cancel, expires_at)

import OrderService from '../orderService';
import {
  mockPool,
  mockClient,
  mockTransaction,
  createMockOrder,
  createMockOrderItems,
} from '../../__tests__/setup';

describe('OrderService - Lifecycle Metadata', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService(mockPool);
  });

  describe('getOrderDetails', () => {
    it('should return can_cancel=true for pending ONLINE orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'pending',
        payment_method: 'online',
        created_at: new Date(),
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = {
        id: 'addr-123',
        full_name: 'John Doe',
        address_line1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        phone_number: '9876543210',
      };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Get order
        .mockResolvedValueOnce({ rows: mockItems }) // Get items
        .mockResolvedValueOnce({ rows: [] }) // Get customizations
        .mockResolvedValueOnce({ rows: [mockAddress] }); // Get address

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.can_cancel).toBe(true);
      expect(result.expires_at).toBeDefined();
      expect(result.expires_at).toBeInstanceOf(Date);
      
      // Verify expiry is ~30 minutes from creation
      const expiryTime = new Date(result.expires_at!).getTime();
      const creationTime = new Date(mockOrder.created_at).getTime();
      const diffMinutes = (expiryTime - creationTime) / (60 * 1000);
      expect(diffMinutes).toBeCloseTo(30, 0);
    });

    it('should return can_cancel=false for confirmed COD orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'confirmed',
        payment_method: 'cod',
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = { id: 'addr-123', full_name: 'John Doe' };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockAddress] });

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.can_cancel).toBe(false);
      expect(result.expires_at).toBeNull();
    });

    it('should return can_cancel=false for expired orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'expired',
        payment_method: 'online',
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = { id: 'addr-123', full_name: 'John Doe' };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockAddress] });

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.can_cancel).toBe(false);
    });

    it('should return can_cancel=false for cancelled orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'cancelled',
        payment_method: 'online',
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = { id: 'addr-123', full_name: 'John Doe' };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockAddress] });

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.can_cancel).toBe(false);
    });

    it('should return expires_at=null for COD orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'confirmed',
        payment_method: 'cod',
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = { id: 'addr-123', full_name: 'John Doe' };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockAddress] });

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.expires_at).toBeNull();
    });

    it('should return expires_at=null for confirmed ONLINE orders', async () => {
      // Arrange
      const orderId = 'order-123';
      const mockOrder = createMockOrder({
        status: 'confirmed',
        payment_method: 'online',
      });
      const mockItems = createMockOrderItems(1);
      const mockAddress = { id: 'addr-123', full_name: 'John Doe' };

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockAddress] });

      // Act
      const result = await orderService.getOrderDetails(orderId);

      // Assert
      expect(result.expires_at).toBeNull();
    });

    it('should throw error if order not found', async () => {
      // Arrange
      const orderId = 'nonexistent';

      mockPool.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(orderService.getOrderDetails(orderId)).rejects.toThrow('Order not found');
    });
  });
});
