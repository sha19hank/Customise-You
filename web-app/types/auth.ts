// Type definitions for CustomiseYou Web App

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'user' | 'seller' | 'admin';
  profileImageUrl?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
}

export interface ApiError {
  error: string;
  details?: any;
}
