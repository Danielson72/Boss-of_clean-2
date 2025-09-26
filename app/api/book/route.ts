import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface BookingRequest {
  cleanerId: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  durationHours: number;

  // Property details
  address: string;
  city: string;
  zipCode: string;
  propertyType?: string;
  propertySizeSqufeet?: number;
  specialInstructions?: string;

  // Pricing
  basePrice: number;
  addOns?: Array<{
    name: string;
    price: number;
  }>;
  discountCode?: string;

  // Payment
  paymentMethod: 'stripe' | 'invoice';
  stripePaymentMethodId?: string;

  // Communication
  customerNotes?: string;
  contactPreferences?: {
    sms: boolean;
    email: boolean;
    phone: boolean;
  };
}

interface SubscriptionTierLimits {
  free: number;
  basic: number;
  pro: number;
  enterprise: number;
}

const TIER_LIMITS: SubscriptionTierLimits = {
  free: 1,
  basic: 5,
  pro: 15,
  enterprise: 999999 // Effectively unlimited
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json() as BookingRequest;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'cleanerId', 'serviceType', 'serviceDate', 'serviceTime',
      'durationHours', 'address', 'city', 'zipCode', 'basePrice'
    ];

    for (const field of requiredFields) {
      if (!body[field as keyof BookingRequest]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Get customer information and subscription tier
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select(`
        *,
        cleaners (
          subscription_tier
        )
      `)
      .eq('id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Determine customer's subscription tier
    // Customers inherit tier from their cleaner profile if they have one, otherwise 'free'
    const customerTier = customer.cleaners?.[0]?.subscription_tier || 'free';

    // Check booking limits for customer's tier
    const { data: tierCheckResult, error: tierCheckError } = await supabase
      .rpc('check_booking_tier_limit', {
        p_customer_id: user.id,
        p_tier: customerTier
      });

    if (tierCheckError) {
      console.error('Tier check error:', tierCheckError);
      return NextResponse.json(
        { error: 'Failed to validate booking limits' },
        { status: 500 }
      );
    }

    if (!tierCheckResult) {
      const monthlyLimit = TIER_LIMITS[customerTier as keyof SubscriptionTierLimits];
      return NextResponse.json(
        {
          error: 'Booking limit exceeded',
          message: `Your ${customerTier} tier allows ${monthlyLimit} booking${monthlyLimit > 1 ? 's' : ''} per month. Upgrade your subscription to book more services.`,
          tierLimits: TIER_LIMITS,
          currentTier: customerTier,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    // Validate cleaner exists and is available
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select(`
        id,
        business_name,
        hourly_rate,
        minimum_hours,
        user_id,
        service_areas,
        services,
        instant_booking,
        subscription_tier,
        response_time_hours,
        users (
          full_name,
          email,
          phone
        )
      `)
      .eq('id', body.cleanerId)
      .eq('approval_status', 'approved')
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found or not available' },
        { status: 404 }
      );
    }

    // Validate service area
    if (!cleaner.service_areas?.includes(body.zipCode)) {
      return NextResponse.json(
        { error: 'Cleaner does not service this area' },
        { status: 400 }
      );
    }

    // Validate service type
    if (!cleaner.services?.includes(body.serviceType)) {
      return NextResponse.json(
        { error: 'Cleaner does not offer this service type' },
        { status: 400 }
      );
    }

    // Validate minimum duration
    if (body.durationHours < cleaner.minimum_hours) {
      return NextResponse.json(
        {
          error: 'Duration too short',
          message: `This cleaner requires a minimum of ${cleaner.minimum_hours} hours`,
          minimumHours: cleaner.minimum_hours
        },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const serviceDateTime = new Date(`${body.serviceDate} ${body.serviceTime}`);
    const now = new Date();
    if (serviceDateTime <= now) {
      return NextResponse.json(
        { error: 'Service date must be in the future' },
        { status: 400 }
      );
    }

    // Check for existing bookings at the same time
    const { data: existingBooking } = await supabase
      .from('booking_transactions')
      .select('id')
      .eq('cleaner_id', body.cleanerId)
      .eq('service_date', body.serviceDate)
      .eq('service_time', body.serviceTime)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Time slot already booked' },
        { status: 409 }
      );
    }

    // Calculate pricing
    let totalAmount = body.basePrice * body.durationHours;

    // Add add-ons
    if (body.addOns && body.addOns.length > 0) {
      const addOnTotal = body.addOns.reduce((sum, addon) => sum + addon.price, 0);
      totalAmount += addOnTotal;
    }

    // Apply discount if provided (simplified - would validate discount codes)
    let discountAmount = 0;
    if (body.discountCode) {
      // This would validate against a discounts table
      discountAmount = 0; // Placeholder
    }

    // Calculate travel fee if needed
    const { data: travelFee } = await supabase
      .from('service_areas')
      .select('travel_fee')
      .eq('cleaner_id', body.cleanerId)
      .eq('zip_code', body.zipCode)
      .single();

    const travelFeeAmount = travelFee?.travel_fee || 0;
    totalAmount += travelFeeAmount;

    // Final total after discount
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // Generate booking reference
    const bookingReference = `BC${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    // Create booking record
    const bookingData = {
      customer_id: user.id,
      cleaner_id: body.cleanerId,
      booking_reference: bookingReference,
      service_type: body.serviceType,
      service_date: body.serviceDate,
      service_time: body.serviceTime,
      duration_hours: body.durationHours,
      address: body.address,
      city: body.city,
      zip_code: body.zipCode,
      property_type: body.propertyType,
      property_size_sqft: body.propertySizeSqufeet,
      special_instructions: body.specialInstructions,
      base_price: body.basePrice,
      add_ons: body.addOns || [],
      discount_amount: discountAmount,
      travel_fee: travelFeeAmount,
      total_amount: finalAmount,
      customer_tier: customerTier,
      status: body.paymentMethod === 'invoice' ? 'pending' : 'pending',
      payment_method: body.paymentMethod,
      payment_status: 'pending',
      source: 'web',
      device_info: {
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    };

    const { data: booking, error: bookingError } = await supabase
      .from('booking_transactions')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Handle payment based on method
    let paymentData = null;

    if (body.paymentMethod === 'stripe' && finalAmount > 0) {
      try {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(finalAmount * 100), // Convert to cents
          currency: 'usd',
          customer: customer.stripe_customer_id || undefined,
          payment_method: body.stripePaymentMethodId,
          confirmation_method: cleaner.instant_booking ? 'automatic' : 'manual',
          confirm: cleaner.instant_booking,
          metadata: {
            booking_id: booking.id,
            booking_reference: bookingReference,
            cleaner_id: body.cleanerId,
            customer_id: user.id,
            service_type: body.serviceType,
            service_date: body.serviceDate
          },
          description: `Cleaning service by ${cleaner.business_name} on ${body.serviceDate}`
        });

        // Update booking with payment intent ID
        await supabase
          .from('booking_transactions')
          .update({
            stripe_payment_intent_id: paymentIntent.id,
            payment_status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
            status: paymentIntent.status === 'succeeded' && cleaner.instant_booking ? 'confirmed' : 'pending'
          })
          .eq('id', booking.id);

        paymentData = {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        };

      } catch (stripeError) {
        console.error('Stripe payment error:', stripeError);

        // Clean up booking if payment creation fails
        await supabase
          .from('booking_transactions')
          .delete()
          .eq('id', booking.id);

        return NextResponse.json(
          { error: 'Payment processing failed' },
          { status: 500 }
        );
      }
    }

    // Send notifications (simplified)
    try {
      // Would implement email/SMS notifications here
      // - Customer confirmation
      // - Cleaner notification
      // - Calendar invites
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Don't fail the booking for notification errors
    }

    // Return booking confirmation
    const responseData = {
      success: true,
      booking: {
        id: booking.id,
        reference: bookingReference,
        status: booking.status,
        cleanerName: cleaner.business_name,
        serviceDate: body.serviceDate,
        serviceTime: body.serviceTime,
        duration: body.durationHours,
        address: `${body.address}, ${body.city}`,
        totalAmount: finalAmount,
        instantBooking: cleaner.instant_booking
      },
      payment: paymentData,
      nextSteps: cleaner.instant_booking
        ? 'Your booking is confirmed! You will receive a confirmation email shortly.'
        : 'Your booking request has been sent to the cleaner. You will receive a confirmation once they accept.',
      estimatedResponse: cleaner.instant_booking ? 'Immediate' : `${cleaner.response_time_hours || 24} hours`
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve booking details
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = request.nextUrl;
    const bookingId = searchParams.get('id');
    const reference = searchParams.get('reference');

    if (!bookingId && !reference) {
      return NextResponse.json(
        { error: 'Booking ID or reference is required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('booking_transactions')
      .select(`
        *,
        cleaners (
          business_name,
          business_phone,
          business_email,
          profile_image_url,
          users (
            full_name,
            phone,
            email
          )
        )
      `);

    if (bookingId) {
      query = query.eq('id', bookingId);
    } else {
      query = query.eq('booking_reference', reference);
    }

    // Ensure user can only see their own bookings or bookings for their cleaning business
    query = query.or(`customer_id.eq.${user.id},cleaners.user_id.eq.${user.id}`);

    const { data: booking, error: bookingError } = await query.single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update booking status
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { bookingId, action, reason } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: 'Booking ID and action are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get booking with authorization check
    const { data: booking, error: bookingError } = await supabase
      .from('booking_transactions')
      .select(`
        *,
        cleaners (
          user_id,
          business_name
        )
      `)
      .eq('id', bookingId)
      .or(`customer_id.eq.${user.id},cleaners.user_id.eq.${user.id}`)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'confirm':
        if (booking.cleaners.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Only the cleaner can confirm bookings' },
            { status: 403 }
          );
        }
        updateData.status = 'confirmed';
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmation_code = Math.random().toString(36).substring(2, 8).toUpperCase();
        break;

      case 'cancel':
        if (booking.customer_id !== user.id && booking.cleaners.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Only booking participants can cancel' },
            { status: 403 }
          );
        }
        updateData.status = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user.id;
        updateData.cancellation_reason = reason;
        break;

      case 'start':
        if (booking.cleaners.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Only the cleaner can start the service' },
            { status: 403 }
          );
        }
        updateData.status = 'in_progress';
        updateData.check_in_time = new Date().toISOString();
        break;

      case 'complete':
        if (booking.cleaners.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Only the cleaner can complete the service' },
            { status: 403 }
          );
        }
        updateData.status = 'completed';
        updateData.check_out_time = new Date().toISOString();
        if (booking.check_in_time) {
          const startTime = new Date(booking.check_in_time);
          const endTime = new Date();
          const actualDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
          updateData.actual_duration_hours = Math.round(actualDuration * 10) / 10;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const { error: updateError } = await supabase
      .from('booking_transactions')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      console.error('Booking update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${action}ed successfully`
    });

  } catch (error) {
    console.error('Booking update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}