import { SupabaseClient } from '@supabase/supabase-js';
import type { AvailabilityFilter } from '@/components/search';

export interface SearchFilters {
  location?: string;
  zipCode?: string;
  services?: string[];
  maxPrice?: number;
  minRating?: number;
  availability?: AvailabilityFilter;
  minExperience?: number;
  verifiedOnly?: boolean;
  certifiedOnly?: boolean;
  instantBookingOnly?: boolean;
}

export interface SearchResult {
  id: string;
  businessName: string;
  businessSlug?: string;
  businessDescription?: string;
  profileImageUrl?: string;
  averageRating: number;
  totalReviews: number;
  services: string[];
  hourlyRate: number;
  minimumHours: number;
  yearsExperience: number;
  city?: string;
  state: string;
  subscriptionTier: string;
  insuranceVerified: boolean;
  licenseVerified: boolean;
  backgroundCheckVerified: boolean;
  isCertified: boolean;
  instantBooking: boolean;
}

/**
 * Parse URL search params into SearchFilters object
 */
export function parseSearchParams(searchParams: URLSearchParams): SearchFilters {
  const servicesParam = searchParams.get('services');
  const maxPriceParam = searchParams.get('maxPrice');
  const ratingParam = searchParams.get('rating');
  const experienceParam = searchParams.get('experience');

  return {
    location: searchParams.get('location') || undefined,
    zipCode: searchParams.get('zip') || undefined,
    services: servicesParam ? servicesParam.split(',') : undefined,
    maxPrice: maxPriceParam ? parseInt(maxPriceParam) : undefined,
    minRating: ratingParam ? parseInt(ratingParam) : undefined,
    availability: (searchParams.get('availability') as AvailabilityFilter) || undefined,
    minExperience: experienceParam ? parseInt(experienceParam) : undefined,
    verifiedOnly: searchParams.get('verified') === 'true',
    certifiedOnly: searchParams.get('certified') === 'true',
    instantBookingOnly: searchParams.get('instant') === 'true',
  };
}

/**
 * Build URL search params from SearchFilters object
 */
export function buildSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.location) params.set('location', filters.location);
  if (filters.zipCode) params.set('zip', filters.zipCode);
  if (filters.services && filters.services.length > 0) {
    params.set('services', filters.services.join(','));
  }
  if (filters.maxPrice && filters.maxPrice < 200) {
    params.set('maxPrice', filters.maxPrice.toString());
  }
  if (filters.minRating && filters.minRating > 0) {
    params.set('rating', filters.minRating.toString());
  }
  if (filters.availability && filters.availability !== 'any') {
    params.set('availability', filters.availability);
  }
  if (filters.minExperience && filters.minExperience > 0) {
    params.set('experience', filters.minExperience.toString());
  }
  if (filters.verifiedOnly) params.set('verified', 'true');
  if (filters.certifiedOnly) params.set('certified', 'true');
  if (filters.instantBookingOnly) params.set('instant', 'true');

  return params;
}

/**
 * Get the day of week for availability checking
 */
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Get date range for availability filter
 */
export function getAvailabilityDateRange(
  availability: AvailabilityFilter
): { start: Date; end: Date } | null {
  if (availability === 'any') return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (availability) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    case 'this_week': {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      return { start: today, end: endOfWeek };
    }
    case 'next_week': {
      const startOfNextWeek = new Date(today);
      startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()));
      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
      return { start: startOfNextWeek, end: endOfNextWeek };
    }
    default:
      return null;
  }
}

/**
 * Check if a cleaner is available on a specific date based on their weekly schedule
 */
export function isAvailableOnDate(
  weeklySchedule: Record<string, { enabled: boolean; slots: Array<{ start: string; end: string }> }>,
  date: Date
): boolean {
  const dayOfWeek = getDayOfWeek(date);
  const daySchedule = weeklySchedule[dayOfWeek];

  if (!daySchedule || !daySchedule.enabled) return false;
  if (!daySchedule.slots || daySchedule.slots.length === 0) return false;

  return true;
}

/**
 * Filter cleaners by availability (client-side filtering)
 * This is used when the availability data structure is too complex for SQL filtering
 */
export function filterByAvailability<T extends { weekly_schedule?: unknown }>(
  cleaners: T[],
  availability: AvailabilityFilter
): T[] {
  const dateRange = getAvailabilityDateRange(availability);
  if (!dateRange) return cleaners;

  return cleaners.filter((cleaner) => {
    if (!cleaner.weekly_schedule) return false;

    const schedule = cleaner.weekly_schedule as Record<
      string,
      { enabled: boolean; slots: Array<{ start: string; end: string }> }
    >;

    // Check each day in the range
    const currentDate = new Date(dateRange.start);
    while (currentDate < dateRange.end) {
      if (isAvailableOnDate(schedule, currentDate)) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return false;
  });
}

/**
 * Build search query with all filters
 */
export function buildSearchQuery(
  supabase: SupabaseClient,
  filters: SearchFilters,
  options: { offset: number; limit: number }
) {
  let query = supabase
    .from('cleaners')
    .select(
      `
      *,
      users!inner(full_name, phone, email, city, state, zip_code),
      cleaner_availability(weekly_schedule)
    `,
      { count: 'exact' }
    )
    .in('approval_status', ['approved', 'pending'])
    .order('subscription_tier', { ascending: false })
    .order('average_rating', { ascending: false });

  // Service filter
  if (filters.services && filters.services.length > 0) {
    query = query.overlaps('services', filters.services);
  }

  // Price filter
  if (filters.maxPrice && filters.maxPrice < 200) {
    query = query.lte('hourly_rate', filters.maxPrice);
  }

  // Rating filter
  if (filters.minRating && filters.minRating > 0) {
    query = query.gte('average_rating', filters.minRating);
  }

  // Experience filter
  if (filters.minExperience && filters.minExperience > 0) {
    query = query.gte('years_experience', filters.minExperience);
  }

  // Verified filter
  if (filters.verifiedOnly) {
    query = query.eq('insurance_verified', true).eq('license_verified', true);
  }

  // Certified filter
  if (filters.certifiedOnly) {
    query = query.eq('is_certified', true);
  }

  // Instant booking filter
  if (filters.instantBookingOnly) {
    query = query.eq('instant_booking', true);
  }

  // Pagination
  query = query.range(options.offset, options.offset + options.limit - 1);

  return query;
}
