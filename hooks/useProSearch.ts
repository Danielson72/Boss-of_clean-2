import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface ProSearchFilters {
  zipCode: string;
  radiusMiles: number;
  serviceTypes: string[];
  minRating: number;
  priceRange: [number, number];
  verifiedOnly: boolean;
  instantBookingOnly: boolean;
  ecoFriendlyOnly: boolean;
  petFriendlyOnly: boolean;
  bringsSuppliesOnly: boolean;
  sortBy: 'distance' | 'rating' | 'price_low' | 'price_high' | 'reviews';
}

export interface Professional {
  cleaner_id: string;
  business_name: string;
  business_slug?: string;
  business_description?: string;
  business_phone?: string;
  business_email?: string;
  profile_image_url?: string;
  business_images: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  subscription_tier: string;
  services: string[];
  distance_miles: number;
  next_available_date: string;
  response_time_hours: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check_verified: boolean;
  instant_booking: boolean;
  trust_score: number;
  tagline?: string;
  specialties: string[];
  portfolio_images: string[];
  brings_supplies: boolean;
  eco_friendly: boolean;
  pet_friendly: boolean;
}

export interface SearchResult {
  results: Professional[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasMore: boolean;
  };
  filters: Partial<ProSearchFilters>;
}

export interface UseProSearchReturn {
  professionals: Professional[];
  loading: boolean;
  error: string | null;
  pagination: SearchResult['pagination'] | null;
  searchProfessionals: (filters: ProSearchFilters) => Promise<void>;
  searchByLocation: (zipCode: string, radius?: number, serviceType?: string) => Promise<void>;
  clearResults: () => void;
}

export const useProSearch = (): UseProSearchReturn => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<SearchResult['pagination'] | null>(null);

  const supabase = createClientComponentClient();

  const searchProfessionals = useCallback(async (filters: ProSearchFilters) => {
    if (!filters.zipCode) {
      setError('ZIP code is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the geospatial search function directly
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_cleaners_by_location', {
          search_zip_code: filters.zipCode,
          search_radius_miles: filters.radiusMiles,
          service_filter: filters.serviceTypes.length > 0 ? filters.serviceTypes[0] : null,
          sort_by: filters.sortBy,
          limit_results: 20
        });

      if (searchError) {
        console.error('Direct search error:', searchError);

        // Fallback to API endpoint
        const params = new URLSearchParams({
          zipCode: filters.zipCode,
          radius: filters.radiusMiles.toString(),
          ...(filters.serviceTypes.length > 0 && { serviceType: filters.serviceTypes[0] }),
          ...(filters.minRating > 0 && { minRating: filters.minRating.toString() }),
          ...(filters.priceRange[1] < 200 && { maxPrice: filters.priceRange[1].toString() }),
          ...(filters.verifiedOnly && { verifiedOnly: 'true' }),
          ...(filters.instantBookingOnly && { instantBookingOnly: 'true' }),
          limit: '20'
        });

        const response = await fetch(`/api/pros/search?${params}`);
        const apiData = await response.json();

        if (apiData.success) {
          let results = apiData.data.results || [];

          // Apply client-side filters
          if (filters.ecoFriendlyOnly) {
            results = results.filter((p: Professional) => p.eco_friendly);
          }
          if (filters.petFriendlyOnly) {
            results = results.filter((p: Professional) => p.pet_friendly);
          }
          if (filters.bringsSuppliesOnly) {
            results = results.filter((p: Professional) => p.brings_supplies);
          }
          if (filters.minRating > 0) {
            results = results.filter((p: Professional) => p.average_rating >= filters.minRating);
          }
          if (filters.priceRange[0] > 0) {
            results = results.filter((p: Professional) => p.hourly_rate >= filters.priceRange[0]);
          }
          if (filters.priceRange[1] < 200) {
            results = results.filter((p: Professional) => p.hourly_rate <= filters.priceRange[1]);
          }

          setProfessionals(results);
          setPagination(apiData.data.pagination);
        } else {
          throw new Error(apiData.error || 'Search failed');
        }
      } else {
        // Transform RPC results to match interface
        const transformedResults: Professional[] = searchResults?.map((result: any) => ({
          cleaner_id: result.cleaner_id,
          business_name: result.business_name,
          average_rating: result.average_rating || 0,
          total_reviews: result.total_reviews || 0,
          hourly_rate: result.hourly_rate || 0,
          distance_miles: result.distance_miles || 0,
          services: result.services || [],
          profile_image_url: result.profile_image_url,
          trust_score: result.trust_score || 0,
          instant_booking: result.instant_booking || false,
          response_time_hours: result.response_time_hours || 24,
          city: result.city,
          zip_code: result.zip_code,
          // Default values for missing fields
          business_images: [],
          minimum_hours: 2,
          years_experience: 0,
          total_jobs: 0,
          subscription_tier: 'free',
          next_available_date: new Date().toISOString(),
          insurance_verified: false,
          license_verified: false,
          background_check_verified: false,
          specialties: [],
          portfolio_images: [],
          brings_supplies: false,
          eco_friendly: false,
          pet_friendly: false
        })) || [];

        // Apply client-side filters to RPC results
        let filteredResults = transformedResults;

        if (filters.ecoFriendlyOnly) {
          filteredResults = filteredResults.filter(p => p.eco_friendly);
        }
        if (filters.petFriendlyOnly) {
          filteredResults = filteredResults.filter(p => p.pet_friendly);
        }
        if (filters.bringsSuppliesOnly) {
          filteredResults = filteredResults.filter(p => p.brings_supplies);
        }
        if (filters.minRating > 0) {
          filteredResults = filteredResults.filter(p => p.average_rating >= filters.minRating);
        }
        if (filters.priceRange[0] > 0) {
          filteredResults = filteredResults.filter(p => p.hourly_rate >= filters.priceRange[0]);
        }
        if (filters.priceRange[1] < 200) {
          filteredResults = filteredResults.filter(p => p.hourly_rate <= filters.priceRange[1]);
        }

        setProfessionals(filteredResults);
        setPagination({
          page: 1,
          limit: 20,
          total: filteredResults.length,
          hasMore: false
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search professionals';
      setError(message);
      setProfessionals([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const searchByLocation = useCallback(async (
    zipCode: string,
    radius: number = 15,
    serviceType?: string
  ) => {
    const filters: ProSearchFilters = {
      zipCode,
      radiusMiles: radius,
      serviceTypes: serviceType ? [serviceType] : [],
      minRating: 0,
      priceRange: [0, 200],
      verifiedOnly: false,
      instantBookingOnly: false,
      ecoFriendlyOnly: false,
      petFriendlyOnly: false,
      bringsSuppliesOnly: false,
      sortBy: 'distance'
    };

    await searchProfessionals(filters);
  }, [searchProfessionals]);

  const clearResults = useCallback(() => {
    setProfessionals([]);
    setPagination(null);
    setError(null);
  }, []);

  return {
    professionals,
    loading,
    error,
    pagination,
    searchProfessionals,
    searchByLocation,
    clearResults
  };
};