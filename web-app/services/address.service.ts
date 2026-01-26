// Address service
import apiClient from './api';
import { Address, AddressFormData } from '@/types/address';

export const addressService = {
  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    const response = await apiClient.get(`/users/${userId}/addresses`);
    return response.data.data;
  },

  /**
   * Add new address
   */
  async addAddress(userId: string, addressData: AddressFormData): Promise<Address> {
    const response = await apiClient.post(`/users/${userId}/addresses`, addressData);
    return response.data.data;
  },

  /**
   * Update address
   */
  async updateAddress(userId: string, addressId: string, addressData: Partial<AddressFormData>): Promise<Address> {
    const response = await apiClient.patch(`/users/${userId}/addresses/${addressId}`, addressData);
    return response.data.data;
  },

  /**
   * Delete address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/addresses/${addressId}`);
  },
};
