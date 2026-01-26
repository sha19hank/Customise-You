'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';
import { tokenUtils } from '@/utils/token';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            setUser({
              id: currentUser.userId,
              email: currentUser.email,
              firstName: '',
              lastName: '',
              role: currentUser.role || 'user',
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        tokenUtils.clearTokens();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const authData: AuthResponse = await authService.login(credentials);
      setUser(authData.user);
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      // Extract readable error message
      let errorMessage = 'Login failed';
      if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'object') {
          errorMessage = error.response.data.error.message || errorMessage;
        } else {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const authData: AuthResponse = await authService.register(data);
      setUser(authData.user);
      router.push('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      // Extract readable error message
      let errorMessage = 'Registration failed';
      if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'object') {
          errorMessage = error.response.data.error.message || errorMessage;
        } else {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
