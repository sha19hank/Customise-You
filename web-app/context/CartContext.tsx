'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Cart item type
export interface CartCustomization {
  customizationId: string;
  label: string;
  value: string;
  priceAdjustment: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedCustomizations: CartCustomization[];
  productImage: string;
}

// Cart state
interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// Cart actions
type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; customizationKey: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; customizationKey: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

// Context type
interface CartContextType {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, customizationKey: string) => void;
  updateQuantity: (productId: string, customizationKey: string, quantity: number) => void;
  clearCart: () => void;
  getItemKey: (productId: string, customizations: CartCustomization[]) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to generate unique key for cart items (same product with different customizations = different items)
const generateItemKey = (productId: string, customizations: CartCustomization[]): string => {
  const customizationStr = customizations
    .map(c => `${c.customizationId}:${c.value}`)
    .sort()
    .join('|');
  return `${productId}-${customizationStr}`;
};

// Calculate totals from items
const calculateTotals = (items: CartItem[]): { totalItems: number; totalPrice: number } => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + itemTotal;
  }, 0);
  return { totalItems, totalPrice };
};

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  let newItems: CartItem[];

  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem = action.payload;
      const itemKey = generateItemKey(newItem.productId, newItem.selectedCustomizations);
      
      // Check if item with same product and customizations already exists
      const existingIndex = state.items.findIndex(
        item => generateItemKey(item.productId, item.selectedCustomizations) === itemKey
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + newItem.quantity,
        };
      } else {
        // Add new item
        newItems = [...state.items, newItem];
      }

      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }

    case 'REMOVE_ITEM': {
      newItems = state.items.filter(
        item => generateItemKey(item.productId, item.selectedCustomizations) !== action.payload.customizationKey
      );
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, customizationKey, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        newItems = state.items.filter(
          item => generateItemKey(item.productId, item.selectedCustomizations) !== customizationKey
        );
      } else {
        newItems = state.items.map(item => {
          if (generateItemKey(item.productId, item.selectedCustomizations) === customizationKey) {
            return { ...item, quantity };
          }
          return item;
        });
      }

      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }

    case 'CLEAR_CART': {
      return { items: [], totalItems: 0, totalPrice: 0 };
    }

    case 'LOAD_CART': {
      const totals = calculateTotals(action.payload);
      return { items: action.payload, ...totals };
    }

    default:
      return state;
  }
};

// Initial state
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

// Cart Provider
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: items });
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [state.items]);

  // Cart actions
  const addItem = (item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (productId: string, customizationKey: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId, customizationKey } });
  };

  const updateQuantity = (productId: string, customizationKey: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, customizationKey, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemKey = (productId: string, customizations: CartCustomization[]) => {
    return generateItemKey(productId, customizations);
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
