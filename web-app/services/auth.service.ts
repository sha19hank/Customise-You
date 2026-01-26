// Authentication service
import apiClient from './api';
import { tokenUtils } from '@/utils/token';
import { AuthResponse, LoginCredentials, RegisterData } from '@/types/auth';

export const authService = {
  /**
   * Register a new user
   * PAYLOAD SANITIZATION: Matches backend Zod schema EXACTLY
   * - Backend uses .strict() validation (no extra fields allowed)
   * - phone is optional() not nullable - omit if empty, don't send null
   * - All strings trimmed to prevent validation errors
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Build payload matching backend schema exactly
    const payload: any = {
      email: data.email.trim(),
      password: data.password, // Don't trim password (may have intentional spaces)
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
    };

    // Only include phone if it has a valid value
    // Backend schema: phone: phoneSchema.optional()
    // - optional() means field can be omitted (undefined)
    // - Does NOT accept null, only valid string or omitted entirely
    const trimmedPhone = data.phone?.trim();
    if (trimmedPhone && trimmedPhone.length > 0) {
      payload.phone = trimmedPhone;
    }
    // If phone is empty, field is omitted (not sent at all)

    const response = await apiClient.post('/auth/register', payload);

    const authData = response.data.data;

    // Store tokens
    tokenUtils.setTokens(authData.accessToken, authData.refreshToken);

    return authData;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', credentials);

    const authData = response.data.data;

    // Store tokens
    tokenUtils.setTokens(authData.accessToken, authData.refreshToken);

    return authData;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = tokenUtils.getRefreshToken();
      
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    } finally {
      // Always clear tokens
      tokenUtils.clearTokens();
    }
  },

  /**
   * Get current user from token
   */
  getCurrentUser(): any | null {
    const token = tokenUtils.getAccessToken();
    if (!token) return null;

    try {
      // Decode JWT payload (simple base64 decode)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!tokenUtils.getAccessToken();
  },
};
