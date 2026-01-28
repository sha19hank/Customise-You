'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';
import { tokenUtils } from '@/utils/token';
import apiClient from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch full user profile from backend
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const response = await apiClient.get('/users/me');
      const profileData = response.data.data;
      
      // Transform snake_case to camelCase
      return {
        id: profileData.id,
        email: profileData.email,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        phone: profileData.phone,
        role: profileData.role || 'user',
        profileImageUrl: profileData.profile_image_url,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            // Fetch full profile with firstName, lastName, etc.
            const profile = await fetchUserProfile(currentUser.userId);
            if (profile) {
              setUser(profile);
            } else {
              // Fallback to basic user data from token
              setUser({
                id: currentUser.userId,
                email: currentUser.email,
                firstName: '',
                lastName: '',
                role: currentUser.role || 'user',
              });
            }
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

  const refreshUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profile = await fetchUserProfile(user.id);
      if (profile) {
        setUser(profile);
        // Update localStorage so other components see the updated role
        localStorage.setItem('user', JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const authData: AuthResponse = await authService.login(credentials);
      
      // Fetch full profile after login
      const profile = await fetchUserProfile(authData.user.id);
      setUser(profile || authData.user);
      
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
      
      // Fetch full profile after registration
      const profile = await fetchUserProfile(authData.user.id);
      setUser(profile || authData.user);
      
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
        refreshUserProfile,
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
