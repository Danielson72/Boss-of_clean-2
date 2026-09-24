'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendQuoteResponseEmail } from '@/lib/email/notifications';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/pro/quote-requests/actions' });

export interface MarketplaceQuote {
  id: string;
  service_type: string;
  property_type: string | null;
  property_size: string | null;
  zip_code: string;
  city: string;
  description: string | null;
  service_date: string | null;
  frequency: string | null;
  status: string;
  /**
   * Customer's first name only — derived from users.full_name at read time.
   * Last name, email, phone, and street address are NEVER returned to a pro
   * pre-acceptance. Per BOC_MARKETPLACE_ARCHITECTURE_v1.1 §4 (Customer Journey).
   */
  customer_first_name: string | null;
  cleaner_id: string | null;
  quoted_price: number | null;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
}

/**
 * Load marketplace quotes visible to the current pro.
 * Returns: pending marketplace quotes (cleaner_id IS NULL) + quotes already claimed by this pro.
 */
export async function getMarketplaceQuotes(): Promise<{
  success: boolean;
  quotes?: MarketplaceQuote[];
  cleanerId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner } = await supabase
      .from('pros')
      .select('id, approval_status')
      .eq('user_id', user.id)
      .single();

    if (!cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    if (cleaner.approval_status !== 'approved') {
      return { success: false, error: 'Your account must be approved to view leads' };
    }

    // Read from quote_requests_pro_view (DLD-513/A5): a security-barrier view that
    // exposes ONLY pre-acceptance-safe columns + customer_first_name. Even a future
    // select('*') here CANNOT return address, customer_id, email, phone, or TCPA data —
    // those columns do not exist in the view. Structural PII defense.
    const selectCols = 'id, service_type, property_type, property_size, zip_code, city, description, service_date, frequency, status, cleaner_id, quoted_price, response_message, responded_at, created_at, customer_first_name';

    type RawRow = {
      id: string;
      service_type: string;
      property_type: string | null;
      property_size: string | null;
      zip_code: string;
      city: string;
      description: string | null;
      service_date: string | null;
      frequency: string | null;
      status: string;
      cleaner_id: string | null;
      quoted_price: number | null;
      response_message: string | null;
      responded_at: string | null;
      created_at: string;
      customer_first_name: string | null;
    };

    const stripCustomer = (row: RawRow): MarketplaceQuote => {
      // View already returns first-name-only; pass through directly.
      return { ...row };
    };

    // 1. Pending marketplace quotes (cleaner_id IS NULL)
    const { data: marketplaceQuotes, error: mqError } = await supabase
      .from('quote_requests_pro_view')
      .select(selectCols)
      .is('cleaner_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<RawRow[]>();

    if (mqError) {
      logger.error('Error fetching marketplace quotes', { function: 'getMarketplaceQuotes' }, mqError);
    }

    // 2. Quotes this pro has already claimed/responded to (still pre-acceptance — no PII)
    const { data: myQuotes, error: myError } = await supabase
      .from('quote_requests_pro_view')
      .select(selectCols)
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<RawRow[]>();

    if (myError) {
      logger.error('Error fetching my quotes', { function: 'getMarketplaceQuotes' }, myError);
    }

    // Merge (deduplicate by id, my quotes first)
    const myIds = new Set((myQuotes || []).map(q => q.id));
    const merged: MarketplaceQuote[] = [
      ...(myQuotes || []).map(stripCustomer),
      ...(marketplaceQuotes || []).filter(q => !myIds.has(q.id)).map(stripCustomer),
    ];

    return { success: true, quotes: merged, cleanerId: cleaner.id };
  } catch (error) {
    logger.error('Error in getMarketplaceQuotes', { function: 'getMarketplaceQuotes' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Respond to a marketplace quote request.
 * Claims the quote (sets cleaner_id) and stores the price + message.
 */
export async function respondToQuote(
  quoteId: string,
  price: number,
  message: string,
  availabilityDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner } = await supabase
      .from('pros')
      .select('id, business_name, approval_status')
      .eq('user_id', user.id)
      .single();

    if (!cleaner || cleaner.approval_status !== 'approved') {
      return { success: false, error: 'Approved cleaner profile required' };
    }

    // Validate inputs
    if (price < 1 || price > 100000) {
      return { success: false, error: 'Price must be between $1 and $100,000' };
    }
    if (!message.trim()) {
      return { success: false, error: 'Please include a message with your quote' };
    }

    // Verify through the pro-facing projection; it never exposes customer
    // identity or contact information before payment.
    const { data: quote, error: fetchError } = await supabase
      .from('quote_requests_pro_view')
      .select('id, status, cleaner_id, customer_first_name')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return { success: false, error: 'Quote request not found' };
    }

    if (quote.cleaner_id && quote.cleaner_id !== cleaner.id) {
      return { success: false, error: 'This quote has already been claimed by another pro' };
    }

    if (quote.status !== 'pending') {
      return { success: false, error: 'This quote is no longer available' };
    }

    // A conditional server write handles the state transition without granting
    // the pro a direct read of the private quote row. Recheck the state at write
    // time so a concurrent pro response cannot claim the same quote. A direct
    // request already assigned to this pro is also eligible.
    const adminSupabase = createServiceRoleClient();
    const { data: updatedQuote, error: updateError } = await adminSupabase
      .from('quote_requests')
      .update({
        cleaner_id: cleaner.id,
        status: 'responded',
        quoted_price: price,
        response_message: message.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('status', 'pending')
      .or(`cleaner_id.is.null,cleaner_id.eq.${cleaner.id}`)
      .select('id, customer_id')
      .maybeSingle();

    if (updateError || !updatedQuote) {
      logger.error('Error updating quote request', { function: 'respondToQuote' }, updateError);
      return { success: false, error: 'Failed to submit your quote' };
    }

    const { data: customer } = updatedQuote.customer_id
      ? await adminSupabase.from('users')
        .select('full_name, email')
        .eq('id', updatedQuote.customer_id)
        .maybeSingle()
      : { data: null };
    const customerEmail = customer?.email || null;
    const customerFullName = customer?.full_name || null;
    const customerFirstName = quote.customer_first_name || null;

    // Notify customer via email (fire-and-forget)
    if (customerEmail) {
      sendQuoteResponseEmail({
        to: customerEmail,
        customerName: customerFullName || 'Customer',
        businessName: cleaner.business_name,
        quoteAmount: price,
        availabilityDate: availabilityDate || null,
        message: message.trim(),
        quoteId: quoteId,
      }).catch((err) =>
        logger.error('Failed to send quote response email', { function: 'respondToQuote' }, err)
      );
    }

    // Create in-app notification for admin (uses first name only, never last name)
    try {
      const { data: adminUsers } = await adminSupabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(5);

      if (adminUsers) {
        for (const admin of adminUsers) {
          await adminSupabase.from('notifications').insert({
            user_id: admin.id,
            type: 'quote_response',
            title: 'Pro Responded to Quote',
            message: `${cleaner.business_name} quoted $${price} for ${customerFirstName || 'a customer'}'s request.`,
            action_url: '/dashboard/admin',
          });
        }
      }
    } catch (notifErr) {
      logger.error('Failed to create admin notification', { function: 'respondToQuote' }, notifErr);
    }

    logger.info('Quote response submitted', {
      function: 'respondToQuote',
      quoteId,
      cleanerId: cleaner.id,
      price,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error in respondToQuote', { function: 'respondToQuote' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
