export interface Property {
  id: string;
  title: string;
  address: string;
  listingPrice: number;
  propertyType: 'House' | 'Apartment' | 'Townhouse' | 'Condo' | 'Land' | 'Commercial' | 'Other';
  bedrooms: number;
  bathrooms: number;
  parking: number;
  size: number; // in square meters
  description: string;
  photos: string[]; // array of photo URLs, max 5
  linkedLeadIds: string[]; // IDs of linked leads/clients
  createdAt: string;
  updatedAt: string;
}

export const PROPERTY_TYPES = [
  'House',
  'Apartment',
  'Townhouse',
  'Condo',
  'Land',
  'Commercial',
  'Other'
] as const;