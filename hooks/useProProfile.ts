import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface ProfessionalProfile {
  cleaner_id: string;
  business_name: string;
  business_slug?: string;
  business_description?: string;
  business_phone?: string;
  business_email?: string;
  profile_image_url?: string;
  business_images: string[];
  portfolio_images: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  subscription_tier: string;
  services: string[];
  specialties: string[];
  tagline?: string;
  response_time_hours: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check_verified: boolean;
  instant_booking: boolean;
  trust_score: number;
  brings_supplies: boolean;
  eco_friendly: boolean;
  pet_friendly: boolean;
  city?: string;
  zip_code?: string;
  service_areas: string[];
  certifications?: string[];
  acceptance_rate?: number;
  on_time_rate?: number;
}

export interface ProfileReview {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  service_type: string;
  booking_date: string;
  created_at: string;
  helpful_count: number;
}

export interface ServicePricing {
  service_type: string;
  base_price: number;
  description: string;
  duration_hours: number;
  pricing_tiers?: {
    small?: number;
    medium?: number;
    large?: number;
    extra_large?: number;
  };
}

export interface AvailabilitySlot {
  date: string;
  time_slots: string[];
  is_available: boolean;
  price_multiplier?: number;
}

export interface UseProProfileReturn {
  profile: ProfessionalProfile | null;
  reviews: ProfileReview[];
  services: ServicePricing[];
  availability: AvailabilitySlot[];
  loading: boolean;
  error: string | null;
  reviewsLoading: boolean;
  servicesLoading: boolean;
  availabilityLoading: boolean;
  fetchProfile: (cleanerId: string) => Promise<void>;
  fetchReviews: (cleanerId: string, limit?: number) => Promise<void>;
  fetchServices: (cleanerId: string) => Promise<void>;
  fetchAvailability: (cleanerId: string, startDate?: string, days?: number) => Promise<void>;
  clearProfile: () => void;
}

export const useProProfile = (): UseProProfileReturn => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const supabase = createClientComponentClient();

  const fetchProfile = useCallback(async (cleanerId: string) => {
    if (!cleanerId) {
      setError('Cleaner ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try API endpoint first
      const response = await fetch(`/api/pros/${cleanerId}`);
      const apiData = await response.json();

      if (response.ok && apiData.success) {
        const profileData = apiData.data;

        // Transform API response to match interface
        const transformedProfile: ProfessionalProfile = {
          cleaner_id: profileData.id || profileData.cleaner_id,
          business_name: profileData.business_name,
          business_slug: profileData.business_slug,
          business_description: profileData.business_description,
          business_phone: profileData.business_phone,
          business_email: profileData.business_email,
          profile_image_url: profileData.profile_image_url,
          business_images: profileData.business_images || [],
          portfolio_images: profileData.portfolio_images || [],
          hourly_rate: profileData.hourly_rate || 0,
          minimum_hours: profileData.minimum_hours || 2,
          years_experience: profileData.years_experience || 0,
          average_rating: profileData.average_rating || 0,
          total_reviews: profileData.total_reviews || 0,
          total_jobs: profileData.total_jobs || 0,
          subscription_tier: profileData.subscription_tier || 'free',
          services: profileData.services || [],
          specialties: profileData.specialties || [],
          tagline: profileData.tagline,
          response_time_hours: profileData.response_time_hours || 24,
          insurance_verified: profileData.insurance_verified || false,
          license_verified: profileData.license_verified || false,
          background_check_verified: profileData.background_check_verified || false,
          instant_booking: profileData.instant_booking || false,
          trust_score: profileData.trust_score || 0,
          brings_supplies: profileData.brings_supplies || false,
          eco_friendly: profileData.eco_friendly || false,
          pet_friendly: profileData.pet_friendly || false,
          city: profileData.city,
          zip_code: profileData.zip_code,
          service_areas: profileData.service_areas || [],
          certifications: profileData.certifications || [],
          acceptance_rate: profileData.acceptance_rate,
          on_time_rate: profileData.on_time_rate
        };

        setProfile(transformedProfile);
      } else {
        // Fallback to direct Supabase query
        const { data: cleanerData, error: cleanerError } = await supabase
          .from('cleaners')
          .select(`
            id,
            business_name,
            business_slug,
            business_description,
            business_phone,
            business_email,
            profile_image_url,
            business_images,
            hourly_rate,
            minimum_hours,
            years_experience,
            average_rating,
            total_reviews,
            total_jobs,
            subscription_tier,
            services,
            response_time_hours,
            insurance_verified,
            license_verified,
            background_check_verified,
            instant_booking,
            trust_score,
            city,
            zip_code,
            service_areas,
            professional_profiles (
              tagline,
              specialties,
              portfolio_images,
              brings_supplies,
              eco_friendly,
              pet_friendly,
              certifications,
              acceptance_rate,
              on_time_rate
            )
          `)
          .eq('id', cleanerId)
          .eq('approval_status', 'approved')
          .single();

        if (cleanerError) {
          throw new Error(cleanerError.message);
        }

        if (cleanerData) {
          const profileData = cleanerData.professional_profiles?.[0] || {};

          const transformedProfile: ProfessionalProfile = {
            cleaner_id: cleanerData.id,
            business_name: cleanerData.business_name,
            business_slug: cleanerData.business_slug,
            business_description: cleanerData.business_description,
            business_phone: cleanerData.business_phone,
            business_email: cleanerData.business_email,
            profile_image_url: cleanerData.profile_image_url,
            business_images: cleanerData.business_images || [],
            portfolio_images: profileData.portfolio_images || [],
            hourly_rate: cleanerData.hourly_rate || 0,
            minimum_hours: cleanerData.minimum_hours || 2,
            years_experience: cleanerData.years_experience || 0,
            average_rating: cleanerData.average_rating || 0,
            total_reviews: cleanerData.total_reviews || 0,
            total_jobs: cleanerData.total_jobs || 0,
            subscription_tier: cleanerData.subscription_tier || 'free',
            services: cleanerData.services || [],
            specialties: profileData.specialties || [],
            tagline: profileData.tagline,
            response_time_hours: cleanerData.response_time_hours || 24,
            insurance_verified: cleanerData.insurance_verified || false,
            license_verified: cleanerData.license_verified || false,
            background_check_verified: cleanerData.background_check_verified || false,
            instant_booking: cleanerData.instant_booking || false,
            trust_score: cleanerData.trust_score || 0,
            brings_supplies: profileData.brings_supplies || false,
            eco_friendly: profileData.eco_friendly || false,
            pet_friendly: profileData.pet_friendly || false,
            city: cleanerData.city,
            zip_code: cleanerData.zip_code,
            service_areas: cleanerData.service_areas || [],
            certifications: profileData.certifications || [],
            acceptance_rate: profileData.acceptance_rate,
            on_time_rate: profileData.on_time_rate
          };

          setProfile(transformedProfile);
        } else {
          throw new Error('Professional not found');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch professional profile';
      setError(message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchReviews = useCallback(async (cleanerId: string, limit: number = 10) => {
    if (!cleanerId) return;

    setReviewsLoading(true);

    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          customer_name,
          rating,
          comment,
          service_type,
          booking_date,
          created_at,
          helpful_count
        `)
        .eq('cleaner_id', cleanerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (reviewsError) {
        throw new Error(reviewsError.message);
      }

      setReviews(reviewsData || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [supabase]);

  const fetchServices = useCallback(async (cleanerId: string) => {
    if (!cleanerId) return;

    setServicesLoading(true);

    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services_pricing')
        .select(`
          service_type,
          base_price,
          description,
          duration_hours,
          pricing_tiers
        `)
        .eq('cleaner_id', cleanerId)
        .eq('active', true)
        .order('service_type');

      if (servicesError) {
        throw new Error(servicesError.message);
      }

      setServices(servicesData || []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [supabase]);

  const fetchAvailability = useCallback(async (
    cleanerId: string,
    startDate?: string,
    days: number = 14
  ) => {
    if (!cleanerId) return;

    setAvailabilityLoading(true);

    try {
      const start = startDate || new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(new Date(start).getDate() + days);
      const end = endDate.toISOString().split('T')[0];

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('cleaner_availability')
        .select(`
          date,
          time_slots,
          is_available,
          price_multiplier
        `)
        .eq('cleaner_id', cleanerId)
        .gte('date', start)
        .lte('date', end)
        .order('date');

      if (availabilityError) {
        throw new Error(availabilityError.message);
      }

      setAvailability(availabilityData || []);
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [supabase]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setReviews([]);
    setServices([]);
    setAvailability([]);
    setError(null);
  }, []);

  return {
    profile,
    reviews,
    services,
    availability,
    loading,
    error,
    reviewsLoading,
    servicesLoading,
    availabilityLoading,
    fetchProfile,
    fetchReviews,
    fetchServices,
    fetchAvailability,
    clearProfile
  };
};