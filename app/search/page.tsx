'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  SearchFilters,
  SearchFiltersState,
  SearchResultsGrid,
  LoadMorePagination,
  RecentSearches,
  CleanerCardProps,
  AvailabilityFilter,
  SortByOption
} from '@/components/search';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { haversineDistance, type ZipCoordinates } from '@/lib/utils/distance';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/search/page.tsx' });

const SERVICE_TYPES = [
  'House Cleaning', 'Deep Cleaning', 'Move-in/Move-out Cleaning',
  'Airbnb / STR Turnover', 'Post-Construction Cleaning', 'Office Cleaning',
  'Carpet Cleaning', 'Window Cleaning', 'Pressure Washing',
  'Pool Cleaning', 'Landscaping', 'Air Duct Cleaning'
];

const FLORIDA_ZIP_CODES = [
  '32801', '32804', '32806', '32807', '32809', // Orlando
  '33101', '33109', '33125', '33126', '33131', // Miami
  '33602', '33603', '33604', '33605', '33606', // Tampa
  '32204', '32205', '32207', '32208', '32209', // Jacksonville
  '33301', '33304', '33305', '33306', '33308', // Fort Lauderdale
  '32301', '32303', '32304', '32305', '32308', // Tallahassee
  '33401', '33405', '33406', '33407', '33409', // West Palm Beach
  '34102', '34103', '34104', '34105', '34108'  // Naples
];

const PAGE_SIZE = 12;

interface CleanerData {
  id: string;
  business_name: string;
  business_slug?: string;
  business_description?: string;
  business_phone?: string;
  services?: string[];
  service_areas?: string[];
  hourly_rate?: number;
  minimum_hours?: number;
  years_experience?: number;
  average_rating?: number;
  total_reviews?: number;
  profile_image_url?: string;
  insurance_verified?: boolean;
  license_verified?: boolean;
  background_check?: boolean;
  is_certified?: boolean;
  instant_booking?: boolean;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }> | null;
  subscription_tier?: string;
  users?: {
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [cleaners, setCleaners] = useState<CleanerCardProps[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const { recentSearches, addSearch, removeSearch, clearHistory } = useSearchHistory();

  // Parse URL params for initial filter state
  const initialFilters = useMemo((): SearchFiltersState => {
    const servicesParam = searchParams?.get('services');
    const priceParam = searchParams?.get('maxPrice');
    const ratingParam = searchParams?.get('rating');
    const availabilityParam = searchParams?.get('availability');
    const experienceParam = searchParams?.get('experience');

    const sortParam = searchParams?.get('sort') as SortByOption | null;

    return {
      location: searchParams?.get('location') || '',
      selectedZip: searchParams?.get('zip') || '',
      selectedService: searchParams?.get('service') || '',
      selectedServices: servicesParam ? servicesParam.split(',') : [],
      priceRange: [0, priceParam ? parseInt(priceParam) : 200],
      minRating: ratingParam ? parseInt(ratingParam) : 0,
      availability: (availabilityParam as AvailabilityFilter) || 'any',
      experienceMin: experienceParam ? parseInt(experienceParam) : 0,
      verifiedOnly: searchParams?.get('verified') === 'true',
      certifiedOnly: searchParams?.get('certified') === 'true',
      instantBookingOnly: searchParams?.get('instant') === 'true',
      sortBy: sortParam || 'recommended',
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<SearchFiltersState>(initialFilters);

  const mapCleanerToCardProps = (cleaner: CleanerData): CleanerCardProps => ({
    id: cleaner.id,
    businessName: cleaner.business_name,
    businessSlug: cleaner.business_slug,
    businessDescription: cleaner.business_description,
    profileImageUrl: cleaner.profile_image_url,
    averageRating: cleaner.average_rating || 0,
    totalReviews: cleaner.total_reviews || 0,
    services: cleaner.services || [],
    hourlyRate: cleaner.hourly_rate || 50,
    minimumHours: cleaner.minimum_hours || 2,
    yearsExperience: cleaner.years_experience || 0,
    city: cleaner.users?.city,
    state: cleaner.users?.state || 'FL',
    subscriptionTier: cleaner.subscription_tier || 'free',
    insuranceVerified: cleaner.insurance_verified || false,
    licenseVerified: cleaner.license_verified || false,
    backgroundCheckVerified: cleaner.background_check || false,
    isCertified: cleaner.is_certified || false,
    instantBooking: cleaner.instant_booking || false,
    businessPhone: cleaner.business_phone
  });

  const loadCleaners = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = (pageNum - 1) * PAGE_SIZE;

      // Build query
      let query = supabase
        .from('cleaners')
        .select(`
          *,
          users!inner(full_name, phone, email, city, state, zip_code)
        `, { count: 'exact' })
        .in('approval_status', ['approved', 'pending']);

      // Apply sorting based on sortBy (distance is handled client-side after fetch)
      const sortBy = filters.sortBy || 'recommended';
      switch (sortBy) {
        case 'rating':
          query = query.order('average_rating', { ascending: false })
                       .order('subscription_tier', { ascending: false });
          break;
        case 'price':
          query = query.order('hourly_rate', { ascending: true })
                       .order('subscription_tier', { ascending: false });
          break;
        case 'experience':
          query = query.order('years_experience', { ascending: false })
                       .order('subscription_tier', { ascending: false });
          break;
        default:
          // 'recommended' and 'distance' use default ordering; distance is re-sorted client-side
          query = query.order('subscription_tier', { ascending: false })
                       .order('average_rating', { ascending: false });
      }

      // Apply filters

      // Service type filter (single or multiple)
      if (filters.selectedServices && filters.selectedServices.length > 0) {
        // Filter by any of the selected services
        query = query.overlaps('services', filters.selectedServices);
      } else if (filters.selectedService) {
        query = query.contains('services', [filters.selectedService]);
      }

      // Price range filter
      if (filters.priceRange[1] < 200) {
        query = query.lte('hourly_rate', filters.priceRange[1]);
      }

      // Minimum rating filter
      if (filters.minRating > 0) {
        query = query.gte('average_rating', filters.minRating);
      }

      // Experience filter
      if (filters.experienceMin > 0) {
        query = query.gte('years_experience', filters.experienceMin);
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

      // Apply pagination
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Client-side location filtering
      const searchValue = (filters.selectedZip || filters.location).toLowerCase().trim();
      if (searchValue) {
        filteredData = filteredData.filter((cleaner: CleanerData) => {
          // Check service_areas array
          if (cleaner.service_areas && cleaner.service_areas.length > 0) {
            const matchInAreas = cleaner.service_areas.some(area => {
              const areaLower = area.toLowerCase();
              return areaLower === searchValue || areaLower.includes(searchValue);
            });
            if (matchInAreas) return true;
          }
          // Also check user's city/zip
          const userCity = cleaner.users?.city?.toLowerCase() || '';
          const userZip = cleaner.users?.zip_code || '';
          return userCity.includes(searchValue) || userZip.includes(searchValue);
        });
      }

      // Client-side availability filtering based on business_hours
      if (filters.availability && filters.availability !== 'any') {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const now = new Date();
        const todayIndex = now.getDay();
        const todayName = days[todayIndex];

        filteredData = filteredData.filter((cleaner: CleanerData) => {
          if (filters.availability === 'today' && cleaner.instant_booking) {
            return true;
          }

          const hours = cleaner.business_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
          if (!hours) return true;

          if (filters.availability === 'today') {
            const dayHours = hours[todayName];
            return !dayHours || !dayHours.closed;
          }

          const daysToCheck = filters.availability === 'this_week'
            ? days.slice(todayIndex).concat(days.slice(0, todayIndex))
            : days;

          return daysToCheck.some(day => {
            const dayHours = hours[day];
            return !dayHours || !dayHours.closed;
          });
        });
      }

      // Distance computation and sorting
      let distanceMap: Map<string, number> | null = null;

      if (sortBy === 'distance' && filters.selectedZip) {
        // Fetch coordinates for the search ZIP
        const { data: searchZipData } = await supabase
          .from('florida_zipcodes')
          .select('latitude, longitude')
          .eq('zip_code', filters.selectedZip)
          .single();

        if (searchZipData?.latitude && searchZipData?.longitude) {
          const searchLat = Number(searchZipData.latitude);
          const searchLng = Number(searchZipData.longitude);

          // Collect all unique service area ZIPs
          const allZips = new Set<string>();
          filteredData.forEach((c: CleanerData) => {
            (c.service_areas || []).forEach(z => allZips.add(z));
          });

          // Batch-fetch coordinates
          const { data: zipCoords } = await supabase
            .from('florida_zipcodes')
            .select('zip_code, latitude, longitude')
            .in('zip_code', Array.from(allZips));

          const coordsMap = new Map<string, ZipCoordinates>();
          (zipCoords || []).forEach((z: ZipCoordinates) => {
            if (z.latitude && z.longitude) {
              coordsMap.set(z.zip_code, z);
            }
          });

          // Compute min distance for each cleaner
          distanceMap = new Map<string, number>();
          filteredData.forEach((cleaner: CleanerData) => {
            let minDist = Infinity;
            (cleaner.service_areas || []).forEach(zip => {
              const coords = coordsMap.get(zip);
              if (coords) {
                const dist = haversineDistance(
                  searchLat, searchLng,
                  Number(coords.latitude), Number(coords.longitude)
                );
                if (dist < minDist) minDist = dist;
              }
            });
            if (minDist === Infinity) minDist = 999;
            distanceMap!.set(cleaner.id, minDist);
          });

          // Sort by distance
          filteredData.sort((a: CleanerData, b: CleanerData) => {
            return (distanceMap!.get(a.id) || 999) - (distanceMap!.get(b.id) || 999);
          });
        }
      }

      const mappedCleaners = filteredData.map((cleaner: CleanerData) => {
        const props = mapCleanerToCardProps(cleaner);
        if (distanceMap) {
          props.distance = distanceMap.get(cleaner.id);
        }
        return props;
      });

      if (append) {
        setCleaners(prev => [...prev, ...mappedCleaners]);
      } else {
        setCleaners(mappedCleaners);
      }

      setTotalCount(count || 0);
      setPage(pageNum);

      // Save to recent searches if meaningful filters are set
      if (!append && (filters.selectedZip || filters.location || filters.selectedService)) {
        const parts: string[] = [];
        if (filters.selectedService) parts.push(filters.selectedService);
        if (filters.location) parts.push(`in ${filters.location}`);
        else if (filters.selectedZip) parts.push(`in ${filters.selectedZip}`);
        const label = parts.join(' ') || 'Search';
        addSearch({
          label,
          filters: {
            location: filters.location,
            selectedZip: filters.selectedZip,
            selectedService: filters.selectedService,
          },
        });
      }
    } catch (error) {
      logger.error('Error loading cleaners', { function: 'loadCleaners', error });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, supabase]);

  // Initial load and filter changes
  useEffect(() => {
    loadCleaners(1);
  }, [
    filters.selectedService,
    filters.selectedServices,
    filters.selectedZip,
    filters.location,
    filters.priceRange,
    filters.minRating,
    filters.availability,
    filters.experienceMin,
    filters.verifiedOnly,
    filters.certifiedOnly,
    filters.instantBookingOnly,
    filters.sortBy
  ]);

  // Update URL when filters change (persist all filters)
  useEffect(() => {
    const params = new URLSearchParams();

    // Location filters
    if (filters.location) params.set('location', filters.location);
    if (filters.selectedZip) params.set('zip', filters.selectedZip);

    // Service filters
    if (filters.selectedService) params.set('service', filters.selectedService);
    if (filters.selectedServices && filters.selectedServices.length > 0) {
      params.set('services', filters.selectedServices.join(','));
    }

    // Price filter
    if (filters.priceRange[1] < 200) {
      params.set('maxPrice', filters.priceRange[1].toString());
    }

    // Rating filter
    if (filters.minRating > 0) {
      params.set('rating', filters.minRating.toString());
    }

    // Availability filter
    if (filters.availability !== 'any') {
      params.set('availability', filters.availability);
    }

    // Experience filter
    if (filters.experienceMin > 0) {
      params.set('experience', filters.experienceMin.toString());
    }

    // Boolean filters
    if (filters.verifiedOnly) params.set('verified', 'true');
    if (filters.certifiedOnly) params.set('certified', 'true');
    if (filters.instantBookingOnly) params.set('instant', 'true');

    // Sort
    if (filters.sortBy && filters.sortBy !== 'recommended') {
      params.set('sort', filters.sortBy);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [
    filters.location,
    filters.selectedZip,
    filters.selectedService,
    filters.selectedServices,
    filters.priceRange,
    filters.minRating,
    filters.availability,
    filters.experienceMin,
    filters.verifiedOnly,
    filters.certifiedOnly,
    filters.instantBookingOnly,
    filters.sortBy,
    router
  ]);

  const handleFiltersChange = (newFilters: SearchFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleLoadMore = () => {
    loadCleaners(page + 1, true);
  };

  const handleRequestQuote = (cleanerId: string) => {
    const params = new URLSearchParams();
    params.set('cleaner', cleanerId);
    if (filters.selectedService) params.set('service', filters.selectedService);
    if (filters.selectedZip) params.set('zip', filters.selectedZip);
    router.push(`/quote-request?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      selectedZip: '',
      selectedService: '',
      selectedServices: [],
      priceRange: [0, 200],
      minRating: 0,
      availability: 'any',
      experienceMin: 0,
      verifiedOnly: false,
      certifiedOnly: false,
      instantBookingOnly: false,
      sortBy: 'recommended',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        serviceTypes={SERVICE_TYPES}
        zipCodes={FLORIDA_ZIP_CODES}
      />

      <RecentSearches
        searches={recentSearches}
        onSelect={(savedFilters) => {
          handleFiltersChange({
            ...filters,
            location: savedFilters.location,
            selectedZip: savedFilters.selectedZip,
            selectedService: savedFilters.selectedService,
          });
        }}
        onRemove={removeSearch}
        onClear={clearHistory}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchResultsGrid
          cleaners={cleaners}
          isLoading={loading}
          totalCount={totalCount}
          onRequestQuote={handleRequestQuote}
          onClearFilters={handleClearFilters}
        />

        {!loading && cleaners.length > 0 && (
          <LoadMorePagination
            currentCount={cleaners.length}
            totalCount={totalCount}
            isLoading={loadingMore}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
}
