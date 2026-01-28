// User service for profile management
import apiClient from './api';
import { User } from '@/types/auth';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

export interface UserProfile extends User {
  createdAt?: string;
  dateOfBirth?: string;
}

// Transform backend snake_case response to camelCase
const transformUserProfile = (data: any): UserProfile => {
  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    phone: data.phone,
    role: data.role || 'user',
    profileImageUrl: data.profile_image_url,
    createdAt: data.created_at,
    dateOfBirth: data.date_of_birth,
  };
};

class UserService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/users/me');
    return transformUserProfile(response.data.data);
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.patch('/users/me', data);
    return transformUserProfile(response.data.data);
  }

  /**
   * Get user by ID (for other user profiles)
   */
  async getUserById(userId: string): Promise<UserProfile> {
    const response = await apiClient.get(`/users/${userId}`);
    return transformUserProfile(response.data.data);
  }
}

export const userService = new UserService();
export default userService;
