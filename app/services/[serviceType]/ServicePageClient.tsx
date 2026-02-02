'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ServiceType, getServiceDbValue } from '@/lib/data/service-types';
import { ServiceTypeContent } from '@/components/seo/ServiceTypeContent';
import { CleanerCardProps } from '@/components/search';

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
  subscription_tier?: string;
  users?: {
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

interface ServicePageClientProps {
  serviceType: ServiceType;
}

const PAGE_SIZE = 6;

export function ServicePageClient({ serviceType }: ServicePageClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [cleaners, setCleaners] = useState<CleanerCardProps[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [averagePrice, setAveragePrice] = useState<number | null>(null);

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
    businessPhone: cleaner.business_phone,
  });

  const loadCleaners = useCallback(async () => {
    setIsLoading(true);

    try {
      // Build query to find cleaners offering this service type
      // Match against the shortName which is used in the services array
      const query = supabase
        .from('cleaners')
        .select(
          `
          *,
          users!inner(full_name, phone, email, city, state, zip_code)
        `,
          { count: 'exact' }
        )
        .in('approval_status', ['approved', 'pending'])
        .order('subscription_tier', { ascending: false })
        .order('average_rating', { ascending: false })
        .limit(PAGE_SIZE);

      // The services column contains display names like "House Cleaning"
      // We need to filter by the shortName
      const { data, count, error } = await query;

      if (error) {
        console.error('Error loading cleaners:', error);
        setCleaners([]);
        setTotalCount(0);
        return;
      }

      // Filter cleaners who offer this service type
      // Services are stored as display names in the database
      const serviceNames = [
        serviceType.shortName.toLowerCase(),
        serviceType.name.toLowerCase(),
        serviceType.dbValue.replace(/_/g, ' ').toLowerCase(),
      ];

      const filteredData = (data || []).filter((cleaner: CleanerData) => {
        if (!cleaner.services || cleaner.services.length === 0) return false;
        return cleaner.services.some((service) =>
          serviceNames.some(
            (name) =>
              service.toLowerCase().includes(name) ||
              name.includes(service.toLowerCase())
          )
        );
      });

      const mappedCleaners = filteredData.map(mapCleanerToCardProps);
      setCleaners(mappedCleaners);
      setTotalCount(filteredData.length);

      // Calculate average price from cleaners offering this service
      if (filteredData.length > 0) {
        const prices = filteredData
          .map((c: CleanerData) => c.hourly_rate)
          .filter((p): p is number => p !== null && p !== undefined && p > 0);
        if (prices.length > 0) {
          const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
          setAveragePrice(Math.round(avg));
        }
      }
    } catch (error) {
      console.error('Error loading cleaners:', error);
      setCleaners([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [serviceType, supabase]);

  useEffect(() => {
    loadCleaners();
  }, [loadCleaners]);

  const handleRequestQuote = (cleanerId: string) => {
    const params = new URLSearchParams();
    params.set('cleaner', cleanerId);
    params.set('service', serviceType.dbValue);
    router.push(`/quote-request?${params.toString()}`);
  };

  return (
    <ServiceTypeContent
      serviceType={serviceType}
      cleaners={cleaners}
      totalCount={totalCount}
      isLoading={isLoading}
      averagePrice={averagePrice}
      onRequestQuote={handleRequestQuote}
    />
  );
}
