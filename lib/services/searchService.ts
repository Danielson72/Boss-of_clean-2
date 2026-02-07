import { createClient } from '@/lib/supabase/client';
import { createLogger } from '../utils/logger';
import type { BusinessHours } from '@/lib/types/database';

const logger = createLogger({ file: 'lib/services/searchService' });

export interface Cleaner {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string;
  website_url?: string;
  business_phone?: string;
  business_email?: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  employees_count: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_expires_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
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
  users?: {
    full_name: string | null;
    phone: string | null;
    email: string;
    city: string | null;
    state?: string;
    zip_code: string | null;
  } | null;
  service_areas_detail?: {
    zip_code: string;
    city: string | null;
    county: string | null;
    travel_fee: number;
  }[];
}

export interface SearchFilters {
  serviceType?: string;
  zipCode?: string;
  location?: string; // For city/county/zip text search
  minRating?: number;
  maxPrice?: number;
  minExperience?: number;
  instantBooking?: boolean;
  verified?: boolean;
  certified?: boolean;
  availability?: 'today' | 'this_week' | 'next_week';
  sortBy?: 'rating' | 'price' | 'experience' | 'response_time';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  cleaners: Cleaner[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export class SearchService {
  private supabase = createClient();

  async searchCleaners(filters: SearchFilters): Promise<Cleaner[]> {
    const result = await this.searchCleanersWithPagination(filters);
    return result.cleaners;
  }

  async searchCleanersWithPagination(filters: SearchFilters): Promise<SearchResult> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const offset = (page - 1) * pageSize;

    // First, get the total count
    let countQuery = this.supabase
      .from('cleaners')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved');

    // Apply filters to count query
    if (filters.serviceType) {
      countQuery = countQuery.contains('services', [filters.serviceType]);
    }
    if (filters.zipCode) {
      countQuery = countQuery.contains('service_areas', [filters.zipCode]);
    }
    if (filters.minRating) {
      countQuery = countQuery.gte('average_rating', filters.minRating);
    }
    if (filters.maxPrice) {
      countQuery = countQuery.lte('hourly_rate', filters.maxPrice);
    }
    if (filters.minExperience) {
      countQuery = countQuery.gte('years_experience', filters.minExperience);
    }
    if (filters.instantBooking) {
      countQuery = countQuery.eq('instant_booking', true);
    }
    if (filters.verified) {
      countQuery = countQuery.eq('insurance_verified', true).eq('license_verified', true);
    }
    if (filters.certified) {
      countQuery = countQuery.eq('is_certified', true);
    }

    const { count } = await countQuery;
    const totalCount = count || 0;

    // Now get the actual data
    let query = this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email, city, state, zip_code)
      `)
      .eq('approval_status', 'approved');

    // Filter by service type
    if (filters.serviceType) {
      query = query.contains('services', [filters.serviceType]);
    }

    // Filter by ZIP code using service areas
    if (filters.zipCode) {
      query = query.contains('service_areas', [filters.zipCode]);
    }

    // Filter by location text (search in service_areas array)
    if (filters.location) {
      const searchTerm = filters.location.toLowerCase().trim();
      // Search will be handled client-side for now since Supabase
      // doesn't support case-insensitive array contains
    }

    // Filter by minimum rating
    if (filters.minRating) {
      query = query.gte('average_rating', filters.minRating);
    }

    // Filter by maximum hourly rate
    if (filters.maxPrice) {
      query = query.lte('hourly_rate', filters.maxPrice);
    }

    // Filter by minimum experience
    if (filters.minExperience) {
      query = query.gte('years_experience', filters.minExperience);
    }

    // Filter by instant booking
    if (filters.instantBooking) {
      query = query.eq('instant_booking', true);
    }

    // Filter by verified status (insurance + license)
    if (filters.verified) {
      query = query.eq('insurance_verified', true)
                   .eq('license_verified', true);
    }

    // Filter by certified status
    if (filters.certified) {
      query = query.eq('is_certified', true);
    }

    // Apply sorting with subscription tier priority
    switch (filters.sortBy) {
      case 'rating':
        query = query.order('subscription_tier', { ascending: false })
                     .order('average_rating', { ascending: false });
        break;
      case 'price':
        query = query.order('hourly_rate', { ascending: true })
                     .order('subscription_tier', { ascending: false });
        break;
      case 'experience':
        query = query.order('years_experience', { ascending: false })
                     .order('subscription_tier', { ascending: false });
        break;
      case 'response_time':
        query = query.order('response_time_hours', { ascending: true })
                     .order('subscription_tier', { ascending: false });
        break;
      default:
        // Default sort: subscription tier first (enterprise > pro > basic), then rating
        query = query.order('subscription_tier', { ascending: false })
                     .order('average_rating', { ascending: false })
                     .order('total_reviews', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      logger.error('Search error:', {}, error);
      throw new Error('Failed to search cleaners');
    }

    let cleaners = data || [];

    // Client-side availability filtering based on business_hours JSONB
    if (filters.availability) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const now = new Date();
      const todayIndex = now.getDay();
      const todayName = days[todayIndex];

      cleaners = cleaners.filter(cleaner => {
        // Cleaners with instant booking are always considered available for "today"
        if (filters.availability === 'today' && cleaner.instant_booking) {
          return true;
        }

        const hours = cleaner.business_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
        if (!hours) return true; // No hours set = assume available

        if (filters.availability === 'today') {
          const dayHours = hours[todayName];
          return !dayHours || !dayHours.closed;
        }

        // this_week or next_week: has at least some open days
        const daysToCheck = filters.availability === 'this_week'
          ? days.slice(todayIndex).concat(days.slice(0, todayIndex))
          : days;

        return daysToCheck.some(day => {
          const dayHours = hours[day];
          return !dayHours || !dayHours.closed;
        });
      });
    }

    // Client-side location filtering if location text provided
    if (filters.location) {
      const searchTerm = filters.location.toLowerCase().trim();
      cleaners = cleaners.filter(cleaner => {
        if (!cleaner.service_areas || cleaner.service_areas.length === 0) {
          // Also check user's city/zip
          const userCity = cleaner.users?.city?.toLowerCase() || '';
          const userZip = cleaner.users?.zip_code || '';
          return userCity.includes(searchTerm) || userZip.includes(searchTerm);
        }
        return cleaner.service_areas.some((area: string) => {
          const areaLower = area.toLowerCase();
          return areaLower === searchTerm || areaLower.includes(searchTerm);
        });
      });
    }

    return {
      cleaners,
      totalCount,
      page,
      pageSize,
      hasMore: offset + cleaners.length < totalCount
    };
  }

  async getCleanerById(id: string): Promise<Cleaner | null> {
    const { data, error } = await this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Get cleaner error:', {}, error);
      return null;
    }

    return data;
  }

  async getCleanersInArea(zipCode: string, serviceType?: string): Promise<Cleaner[]> {
    return this.searchCleaners({
      zipCode,
      serviceType,
      sortBy: 'rating'
    });
  }

  async getFeaturedCleaners(limit: number = 6): Promise<Cleaner[]> {
    const { data, error } = await this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email)
      `)
      .in('subscription_tier', ['pro', 'enterprise'])
      .gte('average_rating', 4.0)
      .order('subscription_tier', { ascending: false })
      .order('average_rating', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Featured cleaners error:', {}, error);
      return [];
    }

    return data || [];
  }

  // Get popular ZIP codes in Florida for autocomplete
  getFloridaZipCodes(): string[] {
    return [
      '32801', '32804', '32806', '32807', '32809', // Orlando
      '33101', '33109', '33125', '33126', '33131', '33132', '33134', '33135', '33137', '33139', // Miami
      '33602', '33603', '33604', '33605', '33606', '33607', '33609', '33610', '33611', '33612', // Tampa
      '32204', '32205', '32207', '32208', '32209', '32210', '32211', '32216', '32217', '32218', // Jacksonville
      '33301', '33304', '33305', '33306', '33308', '33309', '33311', '33312', '33315', '33316', // Fort Lauderdale
      '32301', '32303', '32304', '32305', '32308', '32309', '32310', '32311', '32312', '32317', // Tallahassee
      '33401', '33405', '33406', '33407', '33409', '33411', '33412', '33413', '33414', '33415', // West Palm Beach
      '33432', '33433', '33434', '33435', '33436', '33437', '33441', '33442', '33444', '33445', // Boca Raton
      '34102', '34103', '34104', '34105', '34108', '34109', '34110', '34112', '34113', '34114', // Naples
      '33990', '33991', '33993', '33994', // Fort Myers
    ];
  }

  // Get verified cleaners in a specific ZIP code (33801 - Lakeland, FL)
  async getVerifiedCleanersInZip33801(): Promise<Cleaner[]> {
    const { data, error } = await this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email, city, zip_code),
        service_areas!left(zip_code, city, county, travel_fee)
      `)
      .eq('approval_status', 'approved')
      .eq('insurance_verified', true)
      .eq('license_verified', true)
      .eq('background_check_verified', true)
      .or('service_areas.contains.{"33801"},users.zip_code.eq.33801')
      .order('subscription_tier', { ascending: false })
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false });

    if (error) {
      logger.error('Error fetching verified cleaners in 33801:', {}, error);
      throw new Error('Failed to fetch verified cleaners in ZIP code 33801');
    }

    return data || [];
  }

  // Generic function to get verified cleaners in any ZIP code
  async getVerifiedCleanersInZipCode(zipCode: string): Promise<Cleaner[]> {
    const { data, error } = await this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email, city, zip_code),
        service_areas!left(zip_code, city, county, travel_fee)
      `)
      .eq('approval_status', 'approved')
      .eq('insurance_verified', true)
      .eq('license_verified', true)
      .eq('background_check_verified', true)
      .or(`service_areas.contains.{"${zipCode}"},users.zip_code.eq.${zipCode}`)
      .order('subscription_tier', { ascending: false })
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false });

    if (error) {
      logger.error(`Error fetching verified cleaners in ${zipCode}:`, {}, error);
      throw new Error(`Failed to fetch verified cleaners in ZIP code ${zipCode}`);
    }

    return data || [];
  }

  // Get service type options
  getServiceTypes() {
    return [
      { value: 'residential', label: 'Residential Cleaning' },
      { value: 'commercial', label: 'Commercial Cleaning' },
      { value: 'deep_cleaning', label: 'Deep Cleaning' },
      { value: 'pressure_washing', label: 'Pressure Washing' },
      { value: 'window_cleaning', label: 'Window Cleaning' },
      { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
      { value: 'move_in_out', label: 'Move-In/Out Cleaning' },
      { value: 'post_construction', label: 'Post-Construction Cleanup' }
    ];
  }
}

export const searchService = new SearchService();