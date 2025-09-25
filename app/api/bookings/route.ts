import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface BookingRequest {
  cleanerId: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  homeSize: string;
  addOns: string[];
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    zipCode: string;
  };
  specialRequests?: string;
  pricing: {
    basePrice: number;
    addOnTotal: number;
    travelFee: number;
    discount: number;
    totalPrice: number;
  };
}

const TIER_LIMITS = {
  free: 1,
  basic: 5,
  pro: 15,
  enterprise: -1 // unlimited
} as const;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user's subscription tier and booking limits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Failed to fetch user tier:', userError);
      return NextResponse.json(
        { error: 'Failed to verify subscription tier' },
        { status: 500 }
      );
    }

    const currentTier = userData.subscription_tier || 'free';
    const isExpired = userData.subscription_expires_at &&
                     new Date(userData.subscription_expires_at) < new Date();
    const activeTier = isExpired ? 'free' : currentTier;

    // Count confirmed bookings in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: existingBookings, error: bookingCountError } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', user.id)
      .eq('payment_status', 'paid')
      .in('status', ['confirmed', 'completed', 'in_progress'])
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (bookingCountError) {
      console.error('Failed to count bookings:', bookingCountError);
      return NextResponse.json(
        { error: 'Failed to verify booking limits' },
        { status: 500 }
      );
    }

    const bookingCount = existingBookings?.length || 0;
    const tierLimit = TIER_LIMITS[activeTier as keyof typeof TIER_LIMITS];
    const isUnlimited = tierLimit === -1;

    // Check if user has reached their booking limit
    if (!isUnlimited && bookingCount >= tierLimit) {
      const upgradeMessage = activeTier === 'free'
        ? 'Upgrade to Basic ($19/month) for 5 bookings per month'
        : activeTier === 'basic'
        ? 'Upgrade to Pro ($49/month) for 15 bookings per month'
        : 'Upgrade to Enterprise for unlimited bookings';

      return NextResponse.json(
        {
          error: 'Booking limit reached',
          message: `You've reached your ${tierLimit} booking limit for this month. ${upgradeMessage}`,
          tier: activeTier,
          limit: tierLimit,
          used: bookingCount,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    const bookingData: BookingRequest = await request.json();

    // Validate required fields
    if (!bookingData.cleanerId || !bookingData.serviceId || !bookingData.scheduledDate ||
        !bookingData.customerInfo.name || !bookingData.customerInfo.email) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: user.id,
        cleaner_id: bookingData.cleanerId,
        service_type: bookingData.serviceType,
        service_name: bookingData.serviceName,
        scheduled_date: bookingData.scheduledDate,
        scheduled_time: bookingData.scheduledTime,
        duration_hours: bookingData.duration,
        home_size: bookingData.homeSize,
        add_ons: bookingData.addOns,
        address: bookingData.customerInfo.address,
        city: 'Miami', // Default for now
        zip_code: bookingData.customerInfo.zipCode,
        customer_name: bookingData.customerInfo.name,
        customer_email: bookingData.customerInfo.email,
        customer_phone: bookingData.customerInfo.phone,
        special_requests: bookingData.specialRequests,
        base_price: bookingData.pricing.basePrice,
        add_on_total: bookingData.pricing.addOnTotal,
        travel_fee: bookingData.pricing.travelFee,
        discount_amount: bookingData.pricing.discount,
        total_amount: bookingData.pricing.totalPrice,
        status: 'pending_payment',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    // Create Stripe payment intent
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bookingData.pricing.totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        booking_id: booking.id,
        customer_id: user.id,
        cleaner_id: bookingData.cleanerId,
        service_type: bookingData.serviceType,
        service_date: bookingData.scheduledDate
      },
      description: `${bookingData.serviceName} - ${bookingData.scheduledDate}`,
      receipt_email: bookingData.customerInfo.email
    });

    // Update booking with payment intent ID
    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret
      })
      .eq('id', booking.id);

    return NextResponse.json({
      booking_id: booking.id,
      client_secret: paymentIntent.client_secret,
      amount: bookingData.pricing.totalPrice,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}