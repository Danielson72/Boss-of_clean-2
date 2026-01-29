/**
 * Database types generated from Supabase schema
 * @see supabase/complete-schema.sql
 */

// =============================================
// ENUMS
// =============================================

export type UserRole = 'customer' | 'cleaner' | 'admin';

export type ServiceType =
  | 'residential'
  | 'commercial'
  | 'deep_cleaning'
  | 'pressure_washing'
  | 'window_cleaning'
  | 'carpet_cleaning'
  | 'move_in_out'
  | 'post_construction'
  | 'maid_service'
  | 'office_cleaning';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export type QuoteStatus = 'pending' | 'responded' | 'accepted' | 'completed' | 'cancelled';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// =============================================
// TABLE TYPES
// =============================================

/**
 * Users table - extends Supabase auth.users
 */
export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  email_verified: boolean;
  profile_image_url: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: boolean;
  // Extended fields (may not exist in all contexts)
  email_notifications?: boolean;
  sms_notifications?: boolean;
  display_name?: string;
}

/**
 * Business hours JSONB structure
 */
export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

/**
 * Cleaners business profiles
 */
export interface DbCleaner {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  website_url: string | null;
  business_phone: string | null;
  business_email: string | null;
  services: ServiceType[];
  service_areas: string[];
  hourly_rate: number | null;
  minimum_hours: number;
  years_experience: number | null;
  employees_count: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  approval_status: ApprovalStatus;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  response_rate: number;
  profile_image_url: string | null;
  business_images: string[];
  featured_image_url: string | null;
  business_hours: BusinessHours | null;
  instant_booking: boolean;
  response_time_hours: number;
  business_slug: string | null;
  seo_keywords: string[] | null;
  marketing_message: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields for lead tracking
  lead_credits_used?: number;
  lead_credits_reset_at?: string;
  // Extended fields for profile page
  business_address?: string;
  is_certified?: boolean;
}

/**
 * Cleaner with joined user data
 */
export interface CleanerWithUser extends DbCleaner {
  users?: Pick<DbUser, 'full_name' | 'phone' | 'email' | 'city' | 'state' | 'zip_code'> | null;
}

/**
 * Subscriptions table
 */
export interface DbSubscription {
  id: string;
  cleaner_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  tier: SubscriptionTier;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  monthly_price: number | null;
  features: SubscriptionFeatures | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription features JSONB structure
 */
export interface SubscriptionFeatures {
  max_photos: number;
  priority_placement: boolean;
  analytics: boolean;
  featured: boolean;
  lead_generation: boolean;
  priority_support?: boolean;
}

/**
 * Quote requests table
 */
export interface DbQuoteRequest {
  id: string;
  customer_id: string;
  cleaner_id: string | null;
  service_type: ServiceType;
  property_size: string | null;
  property_type: string | null;
  frequency: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  flexible_scheduling: boolean;
  zip_code: string;
  address: string | null;
  city: string | null;
  special_instructions: string | null;
  estimated_hours: number | null;
  budget_range: string | null;
  status: QuoteStatus;
  customer_message: string | null;
  cleaner_response: string | null;
  quoted_price: number | null;
  contact_method: string;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Quote request with joined customer data
 */
export interface QuoteRequestWithCustomer extends DbQuoteRequest {
  customer?: Pick<DbUser, 'full_name' | 'email' | 'phone'> | null;
}

/**
 * Quote request with joined cleaner data
 */
export interface QuoteRequestWithCleaner extends DbQuoteRequest {
  cleaner?: Pick<DbCleaner, 'business_name' | 'business_phone' | 'business_email' | 'average_rating' | 'hourly_rate'> | null;
}

/**
 * Quote request with both joined
 */
export interface QuoteRequestFull extends DbQuoteRequest {
  customer?: Pick<DbUser, 'full_name' | 'email' | 'phone'> | null;
  cleaner?: Pick<DbCleaner, 'business_name' | 'business_phone' | 'business_email' | 'average_rating' | 'hourly_rate'> | null;
}

/**
 * Reviews table
 */
export interface DbReview {
  id: string;
  customer_id: string;
  cleaner_id: string;
  quote_request_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  photos: string[];
  quality_rating: number | null;
  communication_rating: number | null;
  timeliness_rating: number | null;
  value_rating: number | null;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payments table
 */
export interface DbPayment {
  id: string;
  cleaner_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Cleaner service areas
 */
export interface DbCleanerServiceArea {
  id: string;
  cleaner_id: string;
  zip_code: string;
  city: string | null;
  county: string | null;
  travel_fee: number;
  max_travel_distance: number;
  priority: number;
  created_at: string;
}

/**
 * Florida ZIP codes reference
 */
export interface DbFloridaZipCode {
  zip_code: string;
  city: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  median_income: number | null;
  created_at: string;
}

/**
 * Email templates
 */
export interface DbEmailTemplate {
  id: string;
  template_name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: Record<string, string> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Analytics events
 */
export interface DbAnalyticsEvent {
  id: string;
  user_id: string | null;
  event_name: string;
  event_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  page_url: string | null;
  created_at: string;
}

/**
 * Lead matches table (for lead tracking)
 */
export interface DbLeadMatch {
  id: string;
  cleaner_id: string;
  quote_request_id: string | null;
  status: 'new' | 'contacted' | 'booked' | 'lost';
  created_at: string;
  updated_at: string;
}

/**
 * Bookings table
 */
export interface DbBooking {
  id: string;
  cleaner_id: string;
  customer_id: string;
  quote_request_id: string | null;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  total_price: number | null;
  service_type: ServiceType;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  address: string | null;
  city: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Booking with customer data from join
 */
export interface BookingWithCustomer extends DbBooking {
  customer?: Pick<DbUser, 'full_name' | 'email'> | null;
}

/**
 * Conversation for messaging
 */
export interface DbConversation {
  id: string;
  customer_id: string;
  cleaner_id: string;
  quote_request_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Conversation with unread count
 */
export interface ConversationWithUnread extends DbConversation {
  unreadCount?: number;
  otherParticipant?: Pick<DbUser, 'full_name' | 'email'>;
  lastMessage?: string;
}

/**
 * Message in a conversation
 */
export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: UserRole;
  content: string;
  read_at: string | null;
  created_at: string;
}

// =============================================
// UPDATE TYPES (for Supabase update operations)
// =============================================

export type UserUpdate = Partial<Omit<DbUser, 'id' | 'email' | 'created_at'>>;

export type CleanerUpdate = Partial<Omit<DbCleaner, 'id' | 'user_id' | 'created_at'>>;

export type QuoteRequestUpdate = Partial<Omit<DbQuoteRequest, 'id' | 'customer_id' | 'created_at'>>;

// =============================================
// INSERT TYPES (for Supabase insert operations)
// =============================================

export type UserInsert = Omit<DbUser, 'created_at' | 'updated_at' | 'last_login'> & {
  created_at?: string;
  updated_at?: string;
};

export type CleanerInsert = Omit<DbCleaner, 'id' | 'created_at' | 'updated_at' | 'average_rating' | 'total_reviews' | 'total_jobs'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type QuoteRequestInsert = Omit<DbQuoteRequest, 'id' | 'created_at' | 'updated_at' | 'expires_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
