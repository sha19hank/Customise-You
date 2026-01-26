// Address type definitions

// PostgreSQL enum for address_type - case-sensitive, must match DB exactly
export type AddressType = 'Home' | 'Work' | 'Other';

// UI display labels for address types (user-friendly)
export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  Home: 'Home',
  Work: 'Work',
  Other: 'Other',
};

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  address_type: AddressType; // PostgreSQL enum: Home, Work, or Other
  label?: string;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  addressType: AddressType; // PostgreSQL enum: Home, Work, or Other
  label?: string;
}
