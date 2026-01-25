import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomerInvoices, getUpcomingInvoice } from '@/lib/stripe/invoices';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile with Stripe customer ID
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    if (!cleaner.stripe_customer_id) {
      // No Stripe customer yet, return empty invoices
      return NextResponse.json({
        invoices: [],
        upcomingInvoice: null,
        hasMore: false,
      });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startingAfter = searchParams.get('starting_after') || undefined;
    const status = searchParams.get('status') as
      | 'draft'
      | 'open'
      | 'paid'
      | 'uncollectible'
      | 'void'
      | undefined;

    // Fetch invoices from Stripe
    const { invoices, hasMore } = await getCustomerInvoices(
      cleaner.stripe_customer_id,
      {
        limit,
        startingAfter,
        status,
      }
    );

    // Get upcoming invoice preview
    const upcomingInvoice = await getUpcomingInvoice(cleaner.stripe_customer_id);

    return NextResponse.json({
      invoices,
      upcomingInvoice,
      hasMore,
    });
  } catch (error) {
    console.error('Invoices API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
