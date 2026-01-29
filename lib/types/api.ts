/**
 * API request and response types
 */

import type {
  SubscriptionTier,
  QuoteStatus,
  ServiceType,
  DbUser,
  DbCleaner,
  DbQuoteRequest,
  BusinessHours
} from './database';

// =============================================
// COMMON TYPES
// =============================================

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
}

/**
 * Pagination response metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

// =============================================
// AUTH TYPES
// =============================================

/**
 * Sign up request
 */
export interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
  role?: 'customer' | 'cleaner';
}

/**
 * Sign in request
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * Auth service response
 */
export interface AuthServiceResponse<T = unknown> {
  user?: T | null;
  session?: unknown | null;
  profile?: unknown | null;
  cleaner?: unknown | null;
  error: Error | null;
}

// =============================================
// BILLING TYPES
// =============================================

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';

/**
 * Billing API response
 */
export interface BillingResponse {
  subscription: {
    planName: string;
    planTier: SubscriptionTier;
    price: number;
    status: SubscriptionStatus;
    nextBillingDate: string | null;
    cancelAt: string | null;
  };
  leadCredits: {
    used: number;
    total: number;
    isUnlimited: boolean;
    resetDate: string;
    recentUsage: number[];
  };
  paymentMethod: PaymentMethodInfo | null;
  invoices: InvoiceInfo[];
}

/**
 * Payment method info
 */
export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/**
 * Invoice info from Stripe
 */
export interface InvoiceInfo {
  id: string;
  date: number;
  description: string;
  amount: number;
  status: string;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

// Note: For Stripe invoice types, use InvoiceData from '@/lib/stripe/invoices'

// =============================================
// SEARCH TYPES
// =============================================

/**
 * Search filters
 */
export interface SearchFilters {
  serviceType?: string;
  zipCode?: string;
  location?: string;
  minRating?: number;
  maxPrice?: number;
  minExperience?: number;
  instantBooking?: boolean;
  verified?: boolean;
  certified?: boolean;
  sortBy?: 'rating' | 'price' | 'experience' | 'response_time';
  page?: number;
  pageSize?: number;
}

/**
 * Cleaner search result (public view)
 */
export interface CleanerSearchResult {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  website_url?: string;
  business_phone?: string;
  business_email?: string;
  services: ServiceType[];
  service_areas: string[];
  hourly_rate: number | null;
  minimum_hours: number;
  years_experience: number | null;
  employees_count: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: string;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  response_rate: number;
  profile_image_url?: string;
  business_images: string[];
  featured_image_url?: string;
  business_hours?: BusinessHours | null;
  instant_booking: boolean;
  response_time_hours: number;
  business_slug?: string;
  seo_keywords?: string[];
  marketing_message?: string;
  created_at: string;
  updated_at: string;
  // Joined user data
  users?: {
    full_name: string | null;
    phone: string | null;
    email: string;
    city: string | null;
    state?: string;
    zip_code: string | null;
  } | null;
  // Joined service areas detail
  service_areas_detail?: Array<{
    zip_code: string;
    city: string | null;
    county: string | null;
    travel_fee: number;
  }>;
}

/**
 * Search result response
 */
export interface SearchResult {
  cleaners: CleanerSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================
// QUOTE TYPES
// =============================================

/**
 * Create quote request data
 */
export interface CreateQuoteRequestData {
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date?: string;
  preferred_time?: string;
  flexible_scheduling?: boolean;
  zip_code: string;
  address?: string;
  city?: string;
  special_instructions?: string;
  estimated_hours?: number;
  budget_range?: string;
  customer_message?: string;
  contact_method?: string;
  urgent?: boolean;
}

/**
 * Quote request with relations
 */
export interface QuoteRequestResponse {
  id: string;
  customer_id: string;
  cleaner_id?: string;
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date?: string;
  preferred_time?: string;
  flexible_scheduling: boolean;
  zip_code: string;
  address?: string;
  city?: string;
  special_instructions?: string;
  estimated_hours?: number;
  budget_range?: string;
  status: QuoteStatus;
  customer_message?: string;
  cleaner_response?: string;
  quoted_price?: number;
  contact_method: string;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
  customer?: {
    full_name: string;
    email: string;
    phone: string;
  };
  cleaner?: {
    business_name: string;
    business_phone: string;
    business_email: string;
    average_rating: number;
    hourly_rate: number;
  };
}

/**
 * Quote response update data
 */
export interface QuoteResponseData {
  cleaner_id: string;
  cleaner_response: string;
  quoted_price?: number;
  status: 'responded';
  updated_at: string;
}

// =============================================
// LEAD TYPES
// =============================================

/**
 * Lead data for cleaner dashboard
 */
export interface LeadData {
  id: string;
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date: string;
  preferred_time: string;
  zip_code: string;
  city: string;
  budget_range: string;
  special_instructions: string;
  created_at: string;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  };
}

/**
 * Lead claim response
 */
export interface LeadClaimResponse {
  success: boolean;
  error?: string;
  credits_used?: number;
}

// =============================================
// ANALYTICS TYPES
// =============================================

/**
 * Monthly earnings data
 */
export interface MonthlyEarnings {
  month: string;
  year: number;
  earnings: number;
  bookingsCount: number;
}

/**
 * Earnings statistics
 */
export interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  totalBookings: number;
  completedBookings: number;
  conversionRate: number;
  averageBookingValue: number;
}

/**
 * Booking earning data
 */
export interface BookingEarning {
  id: string;
  booking_date: string;
  total_price: number;
  service_type: string;
  status: string;
  customer_name: string;
}

/**
 * Full earnings data response
 */
export interface EarningsData {
  stats: EarningsStats;
  monthlyData: MonthlyEarnings[];
  recentBookings: BookingEarning[];
}

/**
 * Booking data from database with customer join
 */
export interface BookingData {
  id: string;
  booking_date: string;
  total_price: number | null;
  service_type: string;
  status: string;
  created_at: string;
  customer?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

// =============================================
// CLEANER PROFILE TYPES
// =============================================

/**
 * Cleaner profile form data
 */
export interface CleanerProfileFormData {
  id: string;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  is_certified?: boolean;
  website_url?: string;
  business_address?: string;
  business_images: string[];
}

/**
 * User profile form data
 */
export interface UserProfileFormData {
  display_name?: string;
  full_name?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

// =============================================
// ONBOARDING TYPES
// =============================================

/**
 * Onboarding document
 */
export interface OnboardingDocument {
  document_type: string;
  file_name: string;
  file_url: string;
}

/**
 * Onboarding data
 */
export interface OnboardingData {
  business_name: string;
  business_phone: string;
  business_email: string;
  business_description?: string;
  website_url?: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  employees_count: number;
  documents: OnboardingDocument[];
  training_videos_watched?: string[];
}

// =============================================
// SETTINGS TYPES
// =============================================

/**
 * User settings
 */
export interface UserSettings {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  zip_code?: string;
  role: string;
  email_notifications: boolean;
  sms_notifications: boolean;
}

// =============================================
// MESSAGING TYPES
// =============================================

/**
 * Conversation summary for list view
 */
export interface ConversationSummary {
  id: string;
  customer_id: string;
  cleaner_id: string;
  quote_request_id: string | null;
  last_message_at: string | null;
  created_at: string;
  unreadCount: number;
  otherParticipant?: {
    full_name: string | null;
    email: string;
  };
  lastMessage?: string;
}

// =============================================
// STRIPE TYPES (external)
// =============================================

/**
 * Stripe subscription (simplified)
 */
export interface StripeSubscriptionInfo {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at: number | null;
  default_payment_method?: {
    id: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  } | string;
}

// =============================================
// COMPONENT PROP TYPES
// =============================================

/**
 * Icon component type (for Lucide icons)
 */
export type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Status configuration for UI
 */
export interface StatusConfig {
  label: string;
  color: string;
  icon: IconComponent;
}

// =============================================
// RE-EXPORTS
// =============================================

export type {
  UserRole,
  ServiceType,
  SubscriptionTier,
  QuoteStatus,
  PaymentStatus,
  ApprovalStatus,
  BusinessHours,
  DbUser,
  DbCleaner,
  DbQuoteRequest,
  DbReview,
  DbPayment,
  DbSubscription,
  DbCleanerServiceArea,
  DbBooking,
  BookingWithCustomer,
  CleanerWithUser,
  UserUpdate,
  CleanerUpdate,
  QuoteRequestUpdate,
} from './database';
