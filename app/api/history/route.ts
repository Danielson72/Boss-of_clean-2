import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// import type { Database } from '@/lib/supabase/database.types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 items
    const status = searchParams.get('status');
    const service_type = searchParams.get('service_type');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the base query
    let query = supabase
      .from('booking_history')
      .select(`
        id,
        service_type,
        service_date,
        service_time,
        address,
        city,
        zip_code,
        status,
        total_amount,
        notes,
        before_photos,
        after_photos,
        rating,
        duration_hours,
        created_at,
        updated_at,
        cleaners!inner(
          user_id,
          business_name,
          users!inner(
            full_name
          )
        )
      `)
      .eq('customer_id', user.id)
      .order('service_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (service_type && service_type !== 'all') {
      query = query.eq('service_type', service_type);
    }

    if (date_from) {
      query = query.gte('service_date', date_from);
    }

    if (date_to) {
      query = query.lte('service_date', date_to);
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('booking_history')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id);

    if (countError) {
      throw new Error(`Failed to get booking count: ${countError.message}`);
    }

    // Get paginated results
    const { data: bookings, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    // Transform the data to match our interface
    const transformedBookings = bookings?.map(booking => {
      const cleanerData = booking.cleaners as any;
      return {
        id: booking.id,
        service_type: booking.service_type,
        scheduled_date: booking.service_date,
        scheduled_time: booking.service_time || '09:00',
        address: booking.address,
        city: booking.city,
        zip_code: booking.zip_code,
        status: booking.status as 'completed' | 'cancelled' | 'in_progress' | 'scheduled',
        total_amount: booking.total_amount || 0,
        cleaner_name: cleanerData?.business_name || cleanerData?.users?.full_name || 'Unknown',
        photos_before: booking.before_photos || [],
        photos_after: booking.after_photos || [],
        rating: booking.rating,
        notes: booking.notes,
        service_date: booking.service_date,
        duration_hours: booking.duration_hours,
        created_at: booking.created_at,
        updated_at: booking.updated_at
      };
    }) || [];

    // Calculate pagination metadata
    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    const response = {
      bookings: transformedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching booking history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch booking history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}