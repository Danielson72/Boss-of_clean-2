import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Types for search parameters and results
interface SearchParams {
  zipCode: string;
  serviceType?: string;
  radius?: number;
  minRating?: number;
  maxPrice?: number;
  instantBooking?: boolean;
  date?: string;
  time?: string;
  page?: number;
  limit?: number;
}

interface CleanerSearchResult {
  cleaner_id: string;
  business_name: string;
  business_slug: string;
  tagline: string;
  average_rating: number;
  total_reviews: number;
  hourly_rate: number;
  distance_miles: number;
  response_time_minutes: number;
  instant_booking: boolean;
  subscription_tier: string;
  next_available_date: string;
  badges: any[];
  profile_image_url?: string;
  services?: string[];
  minimum_hours?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const searchParams = request.nextUrl.searchParams;

    // Extract and validate search parameters
    const params: SearchParams = {
      zipCode: searchParams.get('zipCode') || '',
      serviceType: searchParams.get('serviceType') || undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : 10,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : 0,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      instantBooking: searchParams.get('instantBooking') === 'true' ? true : undefined,
      date: searchParams.get('date') || undefined,
      time: searchParams.get('time') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // Validate required parameters
    if (!params.zipCode) {
      return NextResponse.json(
        { error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    // Validate ZIP code format (5 digits)
    if (!/^\d{5}$/.test(params.zipCode)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format' },
        { status: 400 }
      );
    }

    // Calculate offset for pagination
    const offset = ((params.page || 1) - 1) * (params.limit || 20);

    // Call the stored procedure for geospatial search
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_cleaners_by_location', {
        p_zip_code: params.zipCode,
        p_radius_miles: params.radius,
        p_service_type: params.serviceType,
        p_min_rating: params.minRating,
        p_max_price: params.maxPrice,
        p_instant_booking: params.instantBooking,
        p_limit: params.limit,
        p_offset: offset
      });

    if (searchError) {
      console.error('Search error:', searchError);

      // If the stored procedure doesn't exist yet, fall back to regular query
      if (searchError.message?.includes('function') || searchError.message?.includes('does not exist')) {
        // Fallback query using regular tables
        const { data: fallbackResults, error: fallbackError } = await supabase
          .from('cleaners')
          .select(`
            id,
            business_name,
            business_slug,
            business_description,
            services,
            hourly_rate,
            minimum_hours,
            average_rating,
            total_reviews,
            response_time_hours,
            instant_booking,
            subscription_tier,
            profile_image_url,
            service_areas,
            professional_profiles (
              tagline,
              specialties,
              badges,
              response_time_minutes,
              acceptance_rate,
              on_time_rate,
              brings_supplies,
              eco_friendly,
              pet_friendly
            )
          `)
          .eq('approval_status', 'approved')
          .contains('service_areas', [params.zipCode])
          .gte('average_rating', params.minRating || 0)
          .order('subscription_tier', { ascending: false })
          .order('average_rating', { ascending: false, nullsFirst: false })
          .range(offset, offset + (params.limit || 20) - 1);

        if (fallbackError) {
          console.error('Fallback query error:', fallbackError);
          return NextResponse.json(
            { error: 'Failed to search professionals' },
            { status: 500 }
          );
        }

        // Transform fallback results to match expected format
        const transformedResults = fallbackResults?.map(cleaner => ({
          cleaner_id: cleaner.id,
          business_name: cleaner.business_name,
          business_slug: cleaner.business_slug,
          tagline: cleaner.professional_profiles?.[0]?.tagline || '',
          average_rating: cleaner.average_rating || 0,
          total_reviews: cleaner.total_reviews || 0,
          hourly_rate: cleaner.hourly_rate,
          distance_miles: 0, // Would need geospatial calculation
          response_time_minutes: cleaner.professional_profiles?.[0]?.response_time_minutes ||
                                (cleaner.response_time_hours * 60),
          instant_booking: cleaner.instant_booking,
          subscription_tier: cleaner.subscription_tier,
          next_available_date: new Date().toISOString(), // Simplified
          badges: cleaner.professional_profiles?.[0]?.badges || [],
          profile_image_url: cleaner.profile_image_url,
          services: cleaner.services,
          minimum_hours: cleaner.minimum_hours,
          // Additional profile data
          eco_friendly: cleaner.professional_profiles?.[0]?.eco_friendly,
          pet_friendly: cleaner.professional_profiles?.[0]?.pet_friendly,
          brings_supplies: cleaner.professional_profiles?.[0]?.brings_supplies,
          acceptance_rate: cleaner.professional_profiles?.[0]?.acceptance_rate,
          on_time_rate: cleaner.professional_profiles?.[0]?.on_time_rate
        }));

        return NextResponse.json({
          success: true,
          data: {
            results: transformedResults || [],
            pagination: {
              page: params.page || 1,
              limit: params.limit || 20,
              total: fallbackResults?.length || 0,
              hasMore: (fallbackResults?.length || 0) === (params.limit || 20)
            },
            filters: {
              zipCode: params.zipCode,
              radius: params.radius,
              serviceType: params.serviceType,
              minRating: params.minRating,
              maxPrice: params.maxPrice,
              instantBooking: params.instantBooking
            }
          }
        });
      }

      return NextResponse.json(
        { error: 'Search failed', details: searchError.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('cleaners')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved')
      .contains('service_areas', [params.zipCode]);

    // Check availability if date and time are provided
    if (params.date && searchResults) {
      // This would call another function to check real-time availability
      // For now, we'll add a flag to each result
      const resultsWithAvailability = searchResults.map((result: CleanerSearchResult) => ({
        ...result,
        available_on_date: true // Simplified - would check actual availability
      }));

      return NextResponse.json({
        success: true,
        data: {
          results: resultsWithAvailability,
          pagination: {
            page: params.page || 1,
            limit: params.limit || 20,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / (params.limit || 20)),
            hasMore: offset + (params.limit || 20) < (count || 0)
          },
          filters: {
            zipCode: params.zipCode,
            radius: params.radius,
            serviceType: params.serviceType,
            minRating: params.minRating,
            maxPrice: params.maxPrice,
            instantBooking: params.instantBooking,
            date: params.date,
            time: params.time
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        results: searchResults || [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / (params.limit || 20)),
          hasMore: offset + (params.limit || 20) < (count || 0)
        },
        filters: {
          zipCode: params.zipCode,
          radius: params.radius,
          serviceType: params.serviceType,
          minRating: params.minRating,
          maxPrice: params.maxPrice,
          instantBooking: params.instantBooking
        }
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for advanced search with multiple filters
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    // Advanced search parameters
    const {
      zipCodes = [],
      serviceTypes = [],
      priceRange = {},
      availability = {},
      features = {},
      sortBy = 'recommended',
      page = 1,
      limit = 20
    } = body;

    // Build complex query
    let query = supabase
      .from('cleaners')
      .select(`
        *,
        professional_profiles (
          tagline,
          specialties,
          badges,
          response_time_minutes,
          acceptance_rate,
          on_time_rate,
          brings_supplies,
          eco_friendly,
          pet_friendly,
          certifications,
          portfolio_images
        ),
        services_pricing (
          service_type,
          base_price,
          pricing_tiers,
          package_deals
        ),
        reviews (
          rating,
          comment,
          created_at
        )
      `)
      .eq('approval_status', 'approved');

    // Apply filters
    if (zipCodes.length > 0) {
      query = query.overlaps('service_areas', zipCodes);
    }

    if (serviceTypes.length > 0) {
      query = query.overlaps('services', serviceTypes);
    }

    if (priceRange.min !== undefined) {
      query = query.gte('hourly_rate', priceRange.min);
    }

    if (priceRange.max !== undefined) {
      query = query.lte('hourly_rate', priceRange.max);
    }

    // Feature filters
    if (features.instantBooking) {
      query = query.eq('instant_booking', true);
    }

    if (features.ecoFriendly) {
      query = query.eq('professional_profiles.eco_friendly', true);
    }

    if (features.petFriendly) {
      query = query.eq('professional_profiles.pet_friendly', true);
    }

    if (features.bringsSupplies) {
      query = query.eq('professional_profiles.brings_supplies', true);
    }

    // Sorting
    switch (sortBy) {
      case 'rating':
        query = query.order('average_rating', { ascending: false, nullsFirst: false });
        break;
      case 'price_low':
        query = query.order('hourly_rate', { ascending: true });
        break;
      case 'price_high':
        query = query.order('hourly_rate', { ascending: false });
        break;
      case 'reviews':
        query = query.order('total_reviews', { ascending: false });
        break;
      case 'response_time':
        query = query.order('response_time_hours', { ascending: true });
        break;
      case 'recommended':
      default:
        // Sort by tier first, then rating
        query = query
          .order('subscription_tier', { ascending: false })
          .order('average_rating', { ascending: false, nullsFirst: false });
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Advanced search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Process and enrich results
    const enrichedResults = data?.map(cleaner => ({
      id: cleaner.id,
      businessName: cleaner.business_name,
      businessSlug: cleaner.business_slug,
      description: cleaner.business_description,
      rating: cleaner.average_rating,
      reviewCount: cleaner.total_reviews,
      hourlyRate: cleaner.hourly_rate,
      minimumHours: cleaner.minimum_hours,
      instantBooking: cleaner.instant_booking,
      tier: cleaner.subscription_tier,
      profileImage: cleaner.profile_image_url,
      // Profile details
      profile: cleaner.professional_profiles?.[0] || {},
      // Pricing options
      pricing: cleaner.services_pricing || [],
      // Recent reviews
      recentReviews: cleaner.reviews?.slice(0, 3) || [],
      // Calculated fields
      responseTimeText: cleaner.response_time_hours
        ? `Responds in ${cleaner.response_time_hours} hours`
        : 'Quick responder',
      trustIndicators: {
        verified: cleaner.background_check_verified,
        insured: cleaner.insurance_verified,
        licensed: cleaner.license_verified
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        results: enrichedResults,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: offset + limit < (count || 0)
        },
        appliedFilters: {
          zipCodes,
          serviceTypes,
          priceRange,
          features,
          sortBy
        }
      }
    });

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}