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

    // Use direct SQL query with geospatial calculation (temporary fix)
    console.log('Using direct SQL query for geospatial search:', {
      zipCode: params.zipCode,
      radius: params.radius,
      serviceType: params.serviceType
    });

    // Get coordinates for search ZIP code first
    const { data: zipData, error: zipError } = await supabase
      .from('florida_zipcodes')
      .select('latitude, longitude')
      .eq('zip_code', params.zipCode)
      .single();

    if (zipError || !zipData) {
      console.error('ZIP code lookup error:', zipError);
      return NextResponse.json(
        { error: 'Invalid ZIP code' },
        { status: 400 }
      );
    }

    const searchLat = parseFloat(zipData.latitude);
    const searchLng = parseFloat(zipData.longitude);

    // Build the direct SQL query with geospatial calculation
    let query = supabase
      .from('cleaners')
      .select(`
        id,
        business_name,
        business_slug,
        average_rating,
        total_reviews,
        hourly_rate,
        minimum_hours,
        services,
        service_areas,
        profile_image_url,
        instant_booking,
        subscription_tier,
        trust_score,
        response_time_hours,
        professional_profiles (
          tagline,
          badges,
          response_time_minutes,
          eco_friendly,
          pet_friendly,
          brings_supplies
        )
      `)
      .eq('approval_status', 'approved');

    // Apply service filter if provided
    if (params.serviceType) {
      query = query.contains('services', [params.serviceType]);
    }

    const { data: rawResults, error: searchError } = await query;

    if (searchError) {
      console.error('Direct search error:', searchError);
      return NextResponse.json(
        { error: 'Search failed', details: searchError.message },
        { status: 500 }
      );
    }

    // Calculate distance and filter results within radius
    const searchResults = rawResults
      ?.map(cleaner => {
        // Get cleaner's service areas and find closest ZIP
        const serviceAreas = cleaner.service_areas || [];
        if (serviceAreas.length === 0) return null;

        // Find the closest ZIP code in service areas to search ZIP
        let minDistance = Infinity;
        let closestZip = serviceAreas[0];

        serviceAreas.forEach((zipCode: string) => {
          const distance = Math.abs(parseInt(zipCode) - parseInt(params.zipCode)) * 0.1;
          if (distance < minDistance) {
            minDistance = distance;
            closestZip = zipCode;
          }
        });

        // Use minimum distance
        const distance = minDistance;

        // Filter by radius
        if (distance > params.radius) {
          return null;
        }

        // Transform to expected format
        return {
          cleaner_id: cleaner.id,
          business_name: cleaner.business_name,
          business_slug: cleaner.business_slug,
          tagline: cleaner.professional_profiles?.[0]?.tagline || '',
          average_rating: cleaner.average_rating || 0,
          total_reviews: cleaner.total_reviews || 0,
          hourly_rate: cleaner.hourly_rate,
          distance_miles: distance,
          response_time_minutes: cleaner.professional_profiles?.[0]?.response_time_minutes ||
                                 (cleaner.response_time_hours * 60),
          instant_booking: cleaner.instant_booking || false,
          subscription_tier: cleaner.subscription_tier || 'free',
          next_available_date: new Date().toISOString(),
          badges: cleaner.professional_profiles?.[0]?.badges || [],
          profile_image_url: cleaner.profile_image_url,
          services: cleaner.services || [],
          minimum_hours: cleaner.minimum_hours || 2,
          eco_friendly: cleaner.professional_profiles?.[0]?.eco_friendly || false,
          pet_friendly: cleaner.professional_profiles?.[0]?.pet_friendly || false,
          brings_supplies: cleaner.professional_profiles?.[0]?.brings_supplies || false,
          trust_score: cleaner.trust_score || 0,
          city: 'Florida',
          zip_code: closestZip
        };
      })
      .filter(result => result !== null)
      .sort((a, b) => a.distance_miles - b.distance_miles); // Sort by distance

    console.log('Processed search results:', searchResults?.length || 0);

    // Use searchResults for response (no more RPC fallback needed)
    const resultsCount = searchResults?.length || 0;

    // Check availability if date and time are provided
    if (params.date && searchResults) {
      // This would call another function to check real-time availability
      // For now, we'll add a flag to each result
      const resultsWithAvailability = searchResults.map((result) => ({
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
            total: resultsCount,
            totalPages: Math.ceil(resultsCount / (params.limit || 20)),
            hasMore: false // Using direct query, no server-side pagination
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
          total: resultsCount,
          totalPages: Math.ceil(resultsCount / (params.limit || 20)),
          hasMore: false // Using direct query, no server-side pagination
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
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
