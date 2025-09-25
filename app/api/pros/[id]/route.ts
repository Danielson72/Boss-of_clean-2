import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface CleanerProfileData {
  id: string;
  user_id: string;
  business_name: string;
  business_slug: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  website_url: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  employees_count: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check_verified: boolean;
  photo_verified: boolean;
  subscription_tier: string;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  response_rate: number;
  response_time_hours: number;
  profile_image_url: string;
  business_images: string[];
  featured_image_url: string;
  business_hours: any;
  instant_booking: boolean;
  cancellation_policy: string;
  trust_score: number;
  guarantee_eligible: boolean;
  created_at: string;
}

interface ProfessionalProfile {
  tagline: string;
  bio: string;
  specialties: string[];
  languages_spoken: string[];
  certifications: any[];
  insurance_details: any;
  portfolio_images: any[];
  intro_video_url: string;
  team_size: number;
  brings_supplies: boolean;
  eco_friendly: boolean;
  pet_friendly: boolean;
  response_time_minutes: number;
  acceptance_rate: number;
  on_time_rate: number;
  completion_rate: number;
  badges: string[];
  years_on_platform: number;
  repeat_customer_rate: number;
}

interface ServicePricing {
  id: string;
  service_type: string;
  service_name: string;
  description: string;
  base_price: number;
  price_unit: string;
  pricing_tiers: any[];
  package_deals: any[];
  add_ons: any[];
  minimum_charge: number;
  is_active: boolean;
  instant_booking_available: boolean;
  featured: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { id } = params;

    // Validate ID parameter
    if (!id) {
      return NextResponse.json(
        { error: 'Professional ID is required' },
        { status: 400 }
      );
    }

    // Fetch comprehensive professional profile
    const { data: cleanerData, error: cleanerError } = await supabase
      .from('cleaners')
      .select(`
        *,
        users!cleaners_user_id_fkey (
          full_name,
          avatar_url,
          city,
          state
        ),
        professional_profiles (
          tagline,
          bio,
          specialties,
          languages_spoken,
          certifications,
          insurance_details,
          portfolio_images,
          intro_video_url,
          team_size,
          brings_supplies,
          eco_friendly,
          pet_friendly,
          response_time_minutes,
          acceptance_rate,
          on_time_rate,
          completion_rate,
          badges,
          years_on_platform,
          repeat_customer_rate
        ),
        services_pricing (
          id,
          service_type,
          service_name,
          description,
          base_price,
          price_unit,
          pricing_tiers,
          package_deals,
          add_ons,
          minimum_charge,
          is_active,
          instant_booking_available,
          featured
        ),
        service_areas (
          zip_code,
          city,
          county,
          travel_fee,
          is_primary
        ),
        reviews (
          id,
          customer_id,
          rating,
          title,
          comment,
          service_date,
          verified_booking,
          cleaner_response,
          response_date,
          is_published,
          created_at,
          users!reviews_customer_id_fkey (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .eq('approval_status', 'approved')
      .eq('services_pricing.is_active', true)
      .eq('reviews.is_published', true)
      .eq('reviews.flagged', false)
      .order('created_at', { referencedTable: 'reviews', ascending: false })
      .limit(20, { referencedTable: 'reviews' })
      .single();

    if (cleanerError || !cleanerData) {
      console.error('Error fetching cleaner profile:', cleanerError);
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      );
    }

    // Get availability for the next 30 days
    const { data: availability, error: availabilityError } = await supabase
      .rpc('get_cleaner_availability', {
        p_cleaner_id: id,
        p_start_date: new Date().toISOString().split('T')[0],
        p_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .limit(30);

    // Get recent booking statistics
    const { data: recentStats } = await supabase
      .from('booking_transactions')
      .select('status, service_date, total_amount')
      .eq('cleaner_id', id)
      .gte('service_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('service_date', { ascending: false });

    // Calculate dynamic metrics
    const totalBookingsLast90Days = recentStats?.length || 0;
    const completedBookingsLast90Days = recentStats?.filter(b => b.status === 'completed').length || 0;
    const avgBookingValue = recentStats && recentStats.length > 0
      ? recentStats.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) / recentStats.length
      : 0;

    // Structure the response
    const profileData = {
      // Basic Information
      id: cleanerData.id,
      businessName: cleanerData.business_name,
      businessSlug: cleanerData.business_slug,
      ownerName: cleanerData.users?.full_name,
      tagline: cleanerData.professional_profiles?.[0]?.tagline || '',
      bio: cleanerData.professional_profiles?.[0]?.bio || cleanerData.business_description,

      // Contact & Location
      phone: cleanerData.business_phone,
      email: cleanerData.business_email,
      website: cleanerData.website_url,
      city: cleanerData.users?.city,
      state: cleanerData.users?.state,
      serviceAreas: cleanerData.service_areas?.map((area: any) => ({
        zipCode: area.zip_code,
        city: area.city,
        county: area.county,
        travelFee: area.travel_fee,
        isPrimary: area.is_primary
      })) || [],

      // Services & Pricing
      services: cleanerData.services || [],
      servicePricing: cleanerData.services_pricing?.filter((p: ServicePricing) => p.is_active) || [],
      hourlyRate: cleanerData.hourly_rate,
      minimumHours: cleanerData.minimum_hours,

      // Professional Details
      yearsExperience: cleanerData.years_experience,
      teamSize: cleanerData.professional_profiles?.[0]?.team_size || cleanerData.employees_count,
      specialties: cleanerData.professional_profiles?.[0]?.specialties || [],
      languagesSpoken: cleanerData.professional_profiles?.[0]?.languages_spoken || ['English'],

      // Verification & Trust
      verifications: {
        insurance: cleanerData.insurance_verified,
        license: cleanerData.license_verified,
        backgroundCheck: cleanerData.background_check_verified,
        photoVerified: cleanerData.photo_verified
      },
      trustScore: cleanerData.trust_score,
      guaranteeEligible: cleanerData.guarantee_eligible,
      certifications: cleanerData.professional_profiles?.[0]?.certifications || [],
      insuranceDetails: cleanerData.professional_profiles?.[0]?.insurance_details || {},

      // Ratings & Reviews
      rating: {
        average: cleanerData.average_rating || 0,
        total: cleanerData.total_reviews || 0,
        breakdown: {
          // Would calculate from actual reviews
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      },
      reviews: cleanerData.reviews?.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        serviceDate: review.service_date,
        verifiedBooking: review.verified_booking,
        customerName: review.users?.full_name || 'Anonymous',
        customerAvatar: review.users?.avatar_url,
        cleanerResponse: review.cleaner_response,
        responseDate: review.response_date,
        createdAt: review.created_at
      })) || [],

      // Performance Metrics
      stats: {
        totalJobs: cleanerData.total_jobs,
        responseRate: cleanerData.response_rate || 0,
        responseTimeHours: cleanerData.response_time_hours,
        responseTimeMinutes: cleanerData.professional_profiles?.[0]?.response_time_minutes,
        acceptanceRate: cleanerData.professional_profiles?.[0]?.acceptance_rate || 0,
        onTimeRate: cleanerData.professional_profiles?.[0]?.on_time_rate || 0,
        completionRate: cleanerData.professional_profiles?.[0]?.completion_rate || 0,
        repeatCustomerRate: cleanerData.professional_profiles?.[0]?.repeat_customer_rate || 0,
        // Recent performance
        recentBookings: totalBookingsLast90Days,
        recentCompletions: completedBookingsLast90Days,
        avgBookingValue: Math.round(avgBookingValue)
      },

      // Features & Preferences
      features: {
        instantBooking: cleanerData.instant_booking,
        bringsSupplies: cleanerData.professional_profiles?.[0]?.brings_supplies || false,
        ecoFriendly: cleanerData.professional_profiles?.[0]?.eco_friendly || false,
        petFriendly: cleanerData.professional_profiles?.[0]?.pet_friendly || false
      },

      // Media & Portfolio
      profileImage: cleanerData.profile_image_url,
      businessImages: cleanerData.business_images || [],
      featuredImage: cleanerData.featured_image_url,
      portfolioImages: cleanerData.professional_profiles?.[0]?.portfolio_images || [],
      introVideo: cleanerData.professional_profiles?.[0]?.intro_video_url,

      // Business Operations
      businessHours: cleanerData.business_hours || {},
      subscriptionTier: cleanerData.subscription_tier,
      cancellationPolicy: cleanerData.cancellation_policy,
      badges: cleanerData.professional_profiles?.[0]?.badges || [],
      yearsOnPlatform: cleanerData.professional_profiles?.[0]?.years_on_platform || 0,

      // Availability
      availability: availability || [],
      nextAvailableDate: availability?.[0]?.available_date || null,

      // Meta
      profileUrl: `/pro/${cleanerData.business_slug || cleanerData.id}`,
      lastUpdated: cleanerData.updated_at,
      joinedDate: cleanerData.created_at
    };

    return NextResponse.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update professional profile (for cleaner dashboard)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { id } = params;
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the cleaner belongs to the current user
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!cleaner || cleaner.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const {
      businessInfo,
      profileInfo,
      pricing,
      availability,
      portfolio
    } = body;

    // Update main cleaner record
    if (businessInfo) {
      const { error: cleanerUpdateError } = await supabase
        .from('cleaners')
        .update({
          business_name: businessInfo.businessName,
          business_description: businessInfo.description,
          business_phone: businessInfo.phone,
          business_email: businessInfo.email,
          website_url: businessInfo.website,
          services: businessInfo.services,
          hourly_rate: businessInfo.hourlyRate,
          minimum_hours: businessInfo.minimumHours,
          instant_booking: businessInfo.instantBooking,
          cancellation_policy: businessInfo.cancellationPolicy,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (cleanerUpdateError) {
        console.error('Error updating cleaner info:', cleanerUpdateError);
        return NextResponse.json(
          { error: 'Failed to update business information' },
          { status: 500 }
        );
      }
    }

    // Update professional profile
    if (profileInfo) {
      const { error: profileUpdateError } = await supabase
        .from('professional_profiles')
        .upsert({
          cleaner_id: id,
          tagline: profileInfo.tagline,
          bio: profileInfo.bio,
          specialties: profileInfo.specialties,
          languages_spoken: profileInfo.languagesSpoken,
          team_size: profileInfo.teamSize,
          brings_supplies: profileInfo.bringsSupplies,
          eco_friendly: profileInfo.ecoFriendly,
          pet_friendly: profileInfo.petFriendly,
          certifications: profileInfo.certifications,
          insurance_details: profileInfo.insuranceDetails,
          intro_video_url: profileInfo.introVideo,
          updated_at: new Date().toISOString()
        });

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        return NextResponse.json(
          { error: 'Failed to update profile information' },
          { status: 500 }
        );
      }
    }

    // Update pricing (if provided)
    if (pricing && Array.isArray(pricing)) {
      // Delete existing pricing
      await supabase
        .from('services_pricing')
        .delete()
        .eq('cleaner_id', id);

      // Insert new pricing
      const pricingData = pricing.map(p => ({
        cleaner_id: id,
        service_type: p.serviceType,
        service_name: p.serviceName,
        description: p.description,
        base_price: p.basePrice,
        price_unit: p.priceUnit,
        pricing_tiers: p.pricingTiers,
        package_deals: p.packageDeals,
        add_ons: p.addOns,
        minimum_charge: p.minimumCharge,
        is_active: p.isActive !== false,
        instant_booking_available: p.instantBookingAvailable,
        featured: p.featured || false
      }));

      const { error: pricingError } = await supabase
        .from('services_pricing')
        .insert(pricingData);

      if (pricingError) {
        console.error('Error updating pricing:', pricingError);
        return NextResponse.json(
          { error: 'Failed to update pricing information' },
          { status: 500 }
        );
      }
    }

    // Update availability (if provided)
    if (availability) {
      const { error: availabilityError } = await supabase
        .from('cleaner_availability')
        .upsert({
          cleaner_id: id,
          weekly_schedule: availability.weeklySchedule,
          date_overrides: availability.dateOverrides,
          advance_booking_days: availability.advanceBookingDays,
          minimum_notice_hours: availability.minimumNoticeHours,
          buffer_time_minutes: availability.bufferTimeMinutes,
          updated_at: new Date().toISOString()
        });

      if (availabilityError) {
        console.error('Error updating availability:', availabilityError);
        return NextResponse.json(
          { error: 'Failed to update availability' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}