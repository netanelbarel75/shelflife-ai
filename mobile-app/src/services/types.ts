// API types matching the backend schemas
export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  profile_image_url?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  is_verified: boolean;
  is_google_user?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password?: string; // Optional for Google users
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user?: User;
}

// Inventory types
export enum ItemStatus {
  FRESH = 'fresh',
  NEARING = 'nearing',
  EXPIRED = 'expired',
  USED = 'used',
}

export enum ItemSource {
  RECEIPT = 'receipt',
  PHOTO = 'photo',
  MANUAL = 'manual',
}

export interface InventoryItem {
  id: string;
  user_id: string;
  receipt_id?: string;
  name: string;
  category?: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  purchase_date?: string;
  store_name?: string;
  predicted_expiry_date?: string;
  actual_expiry_date?: string;
  confidence_score?: number;
  status: ItemStatus;
  source: ItemSource;
  created_at: string;
  last_updated: string;
  image_url?: string;
  notes?: string;
  days_until_expiry?: number;
}

export interface InventoryItemCreate {
  name: string;
  category?: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  purchase_date?: string;
  store_name?: string;
  notes?: string;
  receipt_id?: string;
  predicted_expiry_date?: string;
  source: ItemSource;
}

export interface InventoryItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  status?: ItemStatus;
  actual_expiry_date?: string;
  notes?: string;
}

export interface InventoryStats {
  total_items: number;
  fresh_items: number;
  nearing_expiry: number;
  expired_items: number;
  used_items: number;
  estimated_value: number;
  waste_prevented_kg: number;
}

export interface InventoryFilter {
  status?: ItemStatus;
  category?: string;
  search_query?: string;
  days_until_expiry_max?: number;
}

// Receipt types
export interface Receipt {
  id: string;
  user_id: string;
  file_path: string;
  original_filename?: string;
  store_name?: string;
  receipt_date?: string;
  total_amount?: number;
  currency: string;
  processed_at: string;
  ocr_text?: string;
  processing_status: string;
  created_at: string;
}

export interface ReceiptUploadResponse {
  receipt_id: string;
  message: string;
  processing_status: string;
}

export interface ParsedReceiptItem {
  name: string;
  quantity?: string;
  price?: number;
  category?: string;
  estimated_expiry_date?: string;
  confidence: number;
}

export interface ReceiptParsingResult {
  receipt_id: string;
  store_name?: string;
  receipt_date?: string;
  total_amount?: number;
  items: ParsedReceiptItem[];
  processing_time_ms: number;
}

// Marketplace types
export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

export interface SellerInfo {
  id: string;
  username: string;
  rating?: number;
  distance_miles?: number;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  inventory_item_id?: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  price: number;
  currency: string;
  is_negotiable: boolean;
  latitude: number;
  longitude: number;
  pickup_address?: string;
  delivery_available: boolean;
  delivery_radius_miles?: number;
  expiry_date?: string;
  available_until?: string;
  status: ListingStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
  seller: SellerInfo;
  days_until_expiry?: number;
}

export interface MarketplaceListingCreate {
  inventory_item_id?: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  price: number;
  currency?: string;
  is_negotiable?: boolean;
  latitude: number;
  longitude: number;
  pickup_address?: string;
  delivery_available?: boolean;
  delivery_radius_miles?: number;
  expiry_date?: string;
  available_until?: string;
}

export interface MarketplaceFilter {
  category?: string;
  max_price?: number;
  max_distance_miles?: number;
  search_query?: string;
  latitude?: number;
  longitude?: number;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  sender_username?: string;
  receiver_username?: string;
}

export interface MessageCreate {
  receiver_id: string;
  listing_id?: string;
  content: string;
}

export interface Conversation {
  partner_id: string;
  partner_username: string;
  latest_message: string;
  latest_message_time: string;
  unread_count: number;
}
