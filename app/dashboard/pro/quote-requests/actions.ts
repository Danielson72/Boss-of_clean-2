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
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
      .from('cleaners')
      .select('id, approval_status')
      .eq('user_id', user.id)
      .single();

    if (!cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    if (cleaner.approval_status !== 'approved') {
      return { success: false, error: 'Your account must be approved to view leads' };
    }

    // Fetch marketplace quotes (RLS now allows this) + own claimed quotes
    // Using two separate queries to handle both cases
    const selectCols = 'id, service_type, property_type, property_size, zip_code, city, description, service_date, frequency, status, contact_name, cleaner_id, quoted_price, response_message, responded_at, created_at';

    // 1. Pending marketplace quotes (cleaner_id IS NULL)
    const { data: marketplaceQuotes, error: mqError } = await supabase
      .from('quote_requests')
      .select(selectCols)
      .is('cleaner_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (mqError) {
      logger.error('Error fetching marketplace quotes', { function: 'getMarketplaceQuotes' }, mqError);
    }

    // 2. Quotes this pro has already claimed/responded to (include contact info)
    const { data: myQuotes, error: myError } = await supabase
      .from('quote_requests')
      .select(selectCols + ', contact_email, contact_phone')
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (myError) {
      logger.error('Error fetching my quotes', { function: 'getMarketplaceQuotes' }, myError);
    }

    // Merge (deduplicate by id, my quotes first)
    const myIds = new Set((myQuotes || []).map(q => (q as unknown as MarketplaceQuote).id));
    const merged = [
      ...(myQuotes || []),
      ...(marketplaceQuotes || []).filter(q => !myIds.has((q as unknown as MarketplaceQuote).id)),
    ];

    return { success: true, quotes: merged as MarketplaceQuote[], cleanerId: cleaner.id };
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
      .from('cleaners')
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

    // Verify the quote is still available (pending, unclaimed)
    const { data: quote, error: fetchError } = await supabase
      .from('quote_requests')
      .select('id, status, cleaner_id, contact_name, contact_email')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return { success: false, error: 'Quote request not found' };
    }

    if (quote.cleaner_id && quote.cleaner_id !== cleaner.id) {
      return { success: false, error: 'This quote has already been claimed by another pro' };
    }

    if (quote.status !== 'pending' && quote.cleaner_id !== cleaner.id) {
      return { success: false, error: 'This quote is no longer available' };
    }

    // Claim + respond: update quote_requests with cleaner_id and quote details
    const { error: updateError } = await supabase
      .from('quote_requests')
      .update({
        cleaner_id: cleaner.id,
        status: 'responded',
        quoted_price: price,
        response_message: message.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      logger.error('Error updating quote request', { function: 'respondToQuote' }, updateError);
      return { success: false, error: 'Failed to submit your quote' };
    }

    // Create notification for the customer (if they have a user account)
    const adminSupabase = createServiceRoleClient();

    // Notify customer via email (fire-and-forget)
    if (quote.contact_email) {
      sendQuoteResponseEmail({
        to: quote.contact_email,
        customerName: quote.contact_name || 'Customer',
        businessName: cleaner.business_name,
        quoteAmount: price,
        availabilityDate: availabilityDate || null,
        message: message.trim(),
        quoteId: quoteId,
      }).catch((err) =>
        logger.error('Failed to send quote response email', { function: 'respondToQuote' }, err)
      );
    }

    // Create in-app notification for admin
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
            message: `${cleaner.business_name} quoted $${price} for ${quote.contact_name || 'a customer'}'s request.`,
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
