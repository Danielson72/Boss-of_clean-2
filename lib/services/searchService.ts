import { createClient } from '@/lib/supabase/client';

export interface Cleaner {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  profile_image_url?: string;
  business_images: string[];
  instant_booking: boolean;
  response_time_hours: number;
  created_at: string;
  updated_at: string;
  users?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export interface SearchFilters {
  serviceType?: string;
  zipCode?: string;
  minRating?: number;
  maxPrice?: number;
  instantBooking?: boolean;
  verified?: boolean;
  sortBy?: 'rating' | 'price' | 'experience' | 'response_time';
}

export class SearchService {
  private supabase = createClient();

  async searchCleaners(filters: SearchFilters): Promise<Cleaner[]> {
    let query = this.supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, phone, email)
      `)
      .neq('subscription_tier', 'free')
      .or('subscription_expires_at.gt.now(),subscription_expires_at.is.null');

    // Filter by service type
    if (filters.serviceType) {
      query = query.contains('services', [filters.serviceType]);
    }

    // Filter by ZIP code (service area)
    if (filters.zipCode) {
      query = query.contains('service_areas', [filters.zipCode]);
    }

    // Filter by minimum rating
    if (filters.minRating) {
      query = query.gte('average_rating', filters.minRating);
    }

    // Filter by maximum hourly rate
    if (filters.maxPrice) {
      query = query.lte('hourly_rate', filters.maxPrice);
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

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'price':
        query = query.order('hourly_rate', { ascending: true });
        break;
      case 'experience':
        query = query.order('years_experience', { ascending: false });
        break;
      case 'response_time':
        query = query.order('response_time_hours', { ascending: true });
        break;
      default:
        // Default sort: subscription tier (pro/enterprise first), then rating
        query = query.order('subscription_tier', { ascending: false })
                     .order('average_rating', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Search error:', error);
      throw new Error('Failed to search cleaners');
    }

    return data || [];
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
      console.error('Get cleaner error:', error);
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
      console.error('Featured cleaners error:', error);
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