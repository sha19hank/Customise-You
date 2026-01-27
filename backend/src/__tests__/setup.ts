// backend/src/__tests__/setup.ts - Test setup and utilities

import { Pool } from 'pg';

// Mock database pool for tests
export const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

// Mock client for transactions
export const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Default mock implementations
  mockPool.connect = jest.fn().mockResolvedValue(mockClient);
  mockClient.query = jest.fn();
  mockClient.release = jest.fn();
});

// Helper to mock transaction flow
export const mockTransaction = (queries: any[] = []) => {
  const queryMock = jest.fn();
  
  queries.forEach((result, index) => {
    queryMock.mockResolvedValueOnce(result);
  });
  
  mockClient.query = queryMock;
  
  return queryMock;
};

// Helper to create mock order
export const createMockOrder = (overrides: any = {}) => ({
  id: 'order-123',
  order_number: 'ORD-123',
  user_id: 'user-123',
  status: 'pending',
  payment_method: 'online',
  payment_status: 'pending',
  subtotal: 1000,
  tax_amount: 180,
  shipping_cost: 0,
  platform_fee: 20,
  total_amount: 1200,
  shipping_address_id: 'addr-123',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Helper to create mock order items
export const createMockOrderItems = (count: number = 1) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      order_id: 'order-123',
      product_id: `product-${i}`,
      quantity: 2,
      unit_price: 500,
      subtotal: 1000,
      item_status: 'pending',
    });
  }
  return items;
};

// Helper to create mock products
export const createMockProducts = (count: number = 1) => {
  const products = [];
  for (let i = 0; i < count; i++) {
    products.push({
      id: `product-${i}`,
      seller_id: 'seller-123',
      quantity_available: 10,
    });
  }
  return products;
};
