'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SearchBar } from '@/components/search/SearchBar';
import {
  SearchResultsGrid,
  LoadMorePagination,
  RecentSearches,
} from '@/components/search';
import { SearchFilters } from '@/components/search/SearchFilters';
import type {
  SearchFiltersState,
  AvailabilityFilter,
  SortByOption,
  DistanceOption,
} from '@/components/search/SearchFilters';
import type { ProviderCardProps } from '@/components/search/ProviderCard';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { haversineDistance, type ZipCoordinates } from '@/lib/utils/distance';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/search/page.tsx' });

const PAGE_SIZE = 12;

interface CleanerData {
  id: string;
  business_name: string;
  business_slug?: string;
  business_description?: string;
  services?: string[];
  service_areas?: string[];
  profile_image_url?: string;
  instant_booking?: boolean;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }> | null;
  created_at?: string;
  users?: {
    city?: string;
    state?: string;
    zip_code?: string;
  } | Array<{ city?: string; state?: string; zip_code?: string }>;
}

function getUsers(cleaner: CleanerData) {
  if (!cleaner.users) return undefined;
  return Array.isArray(cleaner.users) ? cleaner.users[0] : cleaner.users;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [providers, setProviders] = useState<ProviderCardProps[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const { recentSearches, addSearch, removeSearch, clearHistory } = useSearchHistory();

  // Parse URL params for initial filter state
  const initialFilters = useMemo((): SearchFiltersState => ({
    selectedService: searchParams?.get('service') || '',
    selectedZip: searchParams?.get('zip') || '',
    location: searchParams?.get('location') || '',
    distance: (searchParams?.get('distance') as DistanceOption) || '',
    availability: (searchParams?.get('availability') as AvailabilityFilter) || 'any',
    sortBy: (searchParams?.get('sort') as SortByOption) || 'relevance',
  }), [searchParams]);

  const [filters, setFilters] = useState<SearchFiltersState>(initialFilters);

  const mapCleanerToProvider = (cleaner: CleanerData): ProviderCardProps => {
    const user = getUsers(cleaner);
    return {
      id: cleaner.id,
      businessName: cleaner.business_name,
      businessSlug: cleaner.business_slug,
      businessDescription: cleaner.business_description,
      profileImageUrl: cleaner.profile_image_url,
      services: cleaner.services || [],
      city: user?.city,
      state: user?.state || 'FL',
    };
  };

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
          id, business_name, business_slug, business_description,
          services, service_areas, profile_image_url, instant_booking,
          business_hours, created_at,
          users(city, state, zip_code)
        `, { count: 'exact' })
        .in('approval_status', ['approved', 'pending']);

      // Apply sorting
      const sortBy = filters.sortBy || 'relevance';
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'name_az':
          query = query.order('business_name', { ascending: true });
          break;
        default:
          // 'relevance' — default ordering
          query = query.order('created_at', { ascending: false });
      }

      // Service type filter
      if (filters.selectedService) {
        query = query.contains('services', [filters.selectedService]);
      }

      // Apply pagination
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Client-side location filtering
      const searchValue = (filters.selectedZip || filters.location).toLowerCase().trim();
      if (searchValue) {
        filteredData = filteredData.filter((cleaner) => {
          const c = cleaner as CleanerData;
          if (c.service_areas && c.service_areas.length > 0) {
            const matchInAreas = c.service_areas.some(area => {
              const areaLower = area.toLowerCase();
              return areaLower === searchValue || areaLower.includes(searchValue);
            });
            if (matchInAreas) return true;
          }
          const user = getUsers(c);
          const userCity = user?.city?.toLowerCase() || '';
          const userZip = user?.zip_code || '';
          return userCity.includes(searchValue) || userZip.includes(searchValue);
        });
      }

      // Client-side availability filtering based on business_hours
      if (filters.availability && filters.availability !== 'any') {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const now = new Date();
        const todayIndex = now.getDay();
        const todayName = days[todayIndex];

        filteredData = filteredData.filter((cleaner) => {
          const c = cleaner as CleanerData;
          if (filters.availability === 'today' && c.instant_booking) {
            return true;
          }

          const hours = c.business_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
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

      // Distance computation and filtering
      let distanceMap: Map<string, number> | null = null;

      if (filters.selectedZip) {
        const { data: searchZipData } = await supabase
          .from('florida_zipcodes')
          .select('latitude, longitude')
          .eq('zip_code', filters.selectedZip)
          .single();

        if (searchZipData?.latitude && searchZipData?.longitude) {
          const searchLat = Number(searchZipData.latitude);
          const searchLng = Number(searchZipData.longitude);

          const allZips = new Set<string>();
          filteredData.forEach((c) => {
            ((c as CleanerData).service_areas || []).forEach(z => allZips.add(z));
          });

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

          distanceMap = new Map<string, number>();
          filteredData.forEach((cleaner) => {
            const c = cleaner as CleanerData;
            let minDist = Infinity;
            (c.service_areas || []).forEach(zip => {
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
            distanceMap!.set(c.id, minDist);
          });

          // Apply distance filter
          if (filters.distance) {
            const maxDist = parseInt(filters.distance, 10);
            filteredData = filteredData.filter((cleaner) => {
              const dist = distanceMap!.get((cleaner as CleanerData).id) || 999;
              return dist <= maxDist;
            });
          }

          // Sort by distance when zip is provided
          filteredData.sort((a, b) => {
            return (distanceMap!.get((a as CleanerData).id) || 999) - (distanceMap!.get((b as CleanerData).id) || 999);
          });
        }
      }

      const mappedProviders = filteredData.map((cleaner) => {
        const c = cleaner as CleanerData;
        const props = mapCleanerToProvider(c);
        if (distanceMap) {
          props.distance = distanceMap.get(c.id);
        }
        return props;
      });

      if (append) {
        setProviders(prev => [...prev, ...mappedProviders]);
      } else {
        setProviders(mappedProviders);
      }

      setTotalCount(count || 0);
      setPage(pageNum);

      // Save to recent searches
      if (!append && (filters.selectedZip || filters.location || filters.selectedService)) {
        const parts: string[] = [];
        if (filters.selectedService) parts.push(filters.selectedService);
        if (filters.location) parts.push(`in ${filters.location}`);
        else if (filters.selectedZip) parts.push(`near ${filters.selectedZip}`);
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
  }, [filters, supabase, addSearch]);

  // Initial load and filter changes
  useEffect(() => {
    loadCleaners(1);
  }, [
    filters.selectedService,
    filters.selectedZip,
    filters.location,
    filters.distance,
    filters.availability,
    filters.sortBy,
  ]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.location) params.set('location', filters.location);
    if (filters.selectedZip) params.set('zip', filters.selectedZip);
    if (filters.selectedService) params.set('service', filters.selectedService);
    if (filters.distance) params.set('distance', filters.distance);
    if (filters.availability !== 'any') params.set('availability', filters.availability);
    if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sort', filters.sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [
    filters.location,
    filters.selectedZip,
    filters.selectedService,
    filters.distance,
    filters.availability,
    filters.sortBy,
    router,
  ]);

  const handleFiltersChange = (newFilters: SearchFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSearch = (service: string, zip: string) => {
    setFilters(prev => ({
      ...prev,
      selectedService: service,
      selectedZip: zip,
    }));
    setPage(1);
  };

  const handleLoadMore = () => {
    loadCleaners(page + 1, true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Search Bar — dark gradient hero */}
      <SearchBar
        initialService={filters.selectedService}
        initialZip={filters.selectedZip}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recent Searches */}
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

        {/* Layout: Sidebar Filters + Results */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          {/* Filters */}
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            resultCount={providers.length}
            isLoading={loading}
          />

          {/* Results */}
          <main>
            <SearchResultsGrid
              providers={providers}
              isLoading={loading}
              totalCount={totalCount}
              searchLocation={filters.location || filters.selectedZip}
              searchService={filters.selectedService}
            />

            {!loading && providers.length > 0 && (
              <LoadMorePagination
                currentCount={providers.length}
                totalCount={totalCount}
                isLoading={loadingMore}
                onLoadMore={handleLoadMore}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
