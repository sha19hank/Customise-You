'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Wishlist item structure - only stores product IDs
interface WishlistState {
  items: string[]; // Array of product IDs
}

type WishlistAction =
  | { type: 'ADD_TO_WISHLIST'; productId: string }
  | { type: 'REMOVE_FROM_WISHLIST'; productId: string }
  | { type: 'LOAD_WISHLIST'; items: string[] }
  | { type: 'CLEAR_WISHLIST' };

interface WishlistContextType {
  state: WishlistState;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'customiseyou-wishlist';

// Reducer function
function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'ADD_TO_WISHLIST':
      // Avoid duplicates
      if (state.items.includes(action.productId)) {
        return state;
      }
      return {
        ...state,
        items: [...state.items, action.productId],
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(id => id !== action.productId),
      };

    case 'LOAD_WISHLIST':
      return {
        ...state,
        items: action.items,
      };

    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
}

const initialState: WishlistState = {
  items: [],
};

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      try {
        const items = JSON.parse(stored);
        dispatch({ type: 'LOAD_WISHLIST', items });
      } catch (error) {
        console.error('Error loading wishlist from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addToWishlist = (productId: string) => {
    dispatch({ type: 'ADD_TO_WISHLIST', productId });
  };

  const removeFromWishlist = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', productId });
  };

  const isInWishlist = (productId: string): boolean => {
    return state.items.includes(productId);
  };

  const toggleWishlist = (productId: string) => {
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }
  };

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
  };

  return (
    <WishlistContext.Provider
      value={{
        state,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
