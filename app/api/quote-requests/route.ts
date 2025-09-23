import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { quoteService, CreateQuoteRequestData } from '@/lib/services/quote-service';
import { getOrCreateUserId } from '@/lib/auth/get-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { 
      service_type, 
      zip_code, 
      customer_name, 
      customer_email, 
      customer_phone,
      ...otherData 
    } = body;

    if (!service_type || !zip_code || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Missing required fields: service_type, zip_code, customer_name, customer_email' },
        { status: 400 }
      );
    }

    // Get authenticated user or create secure temporary ID
    const { userId, isAuthenticated, isNew } = await getOrCreateUserId();

    // Prepare quote request data with improved structure
    const quoteData: CreateQuoteRequestData = {
      service_type,
      zip_code,
      property_size: otherData.property_size || 'medium',
      property_type: otherData.property_type || 'residential',
      frequency: otherData.frequency || 'one-time',
      preferred_date: otherData.service_date || otherData.preferred_date,
      preferred_time: otherData.service_time || otherData.preferred_time,
      flexible_scheduling: otherData.flexible_scheduling !== false, // Default to true
      address: otherData.address,
      city: otherData.city,
      special_instructions: otherData.special_requests || otherData.description || otherData.special_instructions,
      estimated_hours: parseInt(otherData.duration_hours) || otherData.estimated_hours || 2,
      budget_range: otherData.budget_range,
      customer_message: otherData.description || otherData.customer_message,
      contact_method: otherData.contact_method || 'email',
      urgent: otherData.urgent || false,
    };

    // Store customer contact info for temporary users
    const customerInfo = {
      name: customer_name,
      email: customer_email,
      phone: customer_phone,
    };

    // Create the quote request
    const quote = await quoteService.createQuoteRequest(userId, quoteData, customerInfo);

    // Create response with cookie for temporary users
    const response = NextResponse.json({
      success: true,
      quote_id: quote.id,
      message: 'Quote request submitted successfully! We\'ll connect you with cleaners in your area.',
      customer: customerInfo,
      quote: {
        service_type: quote.service_type,
        zip_code: quote.zip_code,
        status: quote.status,
        created_at: quote.created_at,
      },
      authenticated: isAuthenticated
    });

    // Set secure cookie for temporary users
    if (!isAuthenticated && isNew) {
      response.cookies.set('temp_user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/'
      });
    }

    return response;

  } catch (error) {
    console.error('Error creating quote request:', error);
    return NextResponse.json(
      { error: 'Failed to submit quote request. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // This could be used for getting quote requests (with authentication)
  return NextResponse.json(
    { message: 'Quote requests API - POST to submit a new quote request' },
    { status: 200 }
  );
}