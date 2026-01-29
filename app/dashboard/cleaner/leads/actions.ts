'use server';

import { createClient } from '@/lib/supabase/server';
import { sendQuoteResponseEmail } from '@/lib/email/notifications';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/leads/actions' });

export interface LeadMatch {
  id: string;
  quote_request_id: string;
  match_score: number;
  distance_miles: number | null;
  status: 'pending' | 'viewed' | 'responded' | 'declined' | 'expired';
  viewed_at: string | null;
  responded_at: string | null;
  quote_amount: number | null;
  availability_date: string | null;
  response_message: string | null;
  created_at: string;
  expires_at: string;
  quote_request: {
    id: string;
    service_type: string;
    property_type: string;
    sqft_estimate: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    zip_code: string;
    city: string | null;
    preferred_date: string | null;
    flexibility: string;
    contact_name: string;
    notes: string | null;
    created_at: string;
  };
}

export interface CleanerLeadCredits {
  lead_credits_remaining: number;
  lead_credits_used_this_month: number;
  lead_credits_reset_date: string;
  subscription_tier: string;
}

/**
 * Get all leads matched to the current cleaner
 */
export async function getCleanerLeads(): Promise<{
  success: boolean;
  leads?: LeadMatch[];
  credits?: CleanerLeadCredits;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, lead_credits_remaining, lead_credits_used_this_month, lead_credits_reset_date, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // Get lead matches with quote request details
    const { data: leads, error: leadsError } = await supabase
      .from('lead_matches')
      .select(`
        id,
        quote_request_id,
        match_score,
        distance_miles,
        status,
        viewed_at,
        responded_at,
        quote_amount,
        availability_date,
        response_message,
        created_at,
        expires_at,
        quote_requests (
          id,
          service_type,
          property_type,
          sqft_estimate,
          bedrooms,
          bathrooms,
          zip_code,
          city,
          preferred_date,
          flexibility,
          contact_name,
          notes,
          created_at
        )
      `)
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false });

    if (leadsError) {
      logger.error('Error fetching leads', { function: 'getCleanerLeads' }, leadsError);
      return { success: false, error: 'Failed to fetch leads' };
    }

    // Transform the data
    const transformedLeads: LeadMatch[] = (leads || []).map((lead) => ({
      ...lead,
      quote_request: lead.quote_requests as unknown as LeadMatch['quote_request'],
    }));

    return {
      success: true,
      leads: transformedLeads,
      credits: {
        lead_credits_remaining: cleaner.lead_credits_remaining,
        lead_credits_used_this_month: cleaner.lead_credits_used_this_month,
        lead_credits_reset_date: cleaner.lead_credits_reset_date,
        subscription_tier: cleaner.subscription_tier,
      },
    };
  } catch (error) {
    logger.error('Error in getCleanerLeads', { function: 'getCleanerLeads' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(matchId: string): Promise<{
  success: boolean;
  lead?: LeadMatch;
  credits?: CleanerLeadCredits;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, lead_credits_remaining, lead_credits_used_this_month, lead_credits_reset_date, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // Get the lead match
    const { data: lead, error: leadError } = await supabase
      .from('lead_matches')
      .select(`
        id,
        quote_request_id,
        match_score,
        distance_miles,
        status,
        viewed_at,
        responded_at,
        quote_amount,
        availability_date,
        response_message,
        created_at,
        expires_at,
        quote_requests (
          id,
          service_type,
          property_type,
          sqft_estimate,
          bedrooms,
          bathrooms,
          zip_code,
          city,
          preferred_date,
          flexibility,
          contact_name,
          contact_email,
          notes,
          created_at
        )
      `)
      .eq('id', matchId)
      .eq('cleaner_id', cleaner.id)
      .single();

    if (leadError || !lead) {
      return { success: false, error: 'Lead not found' };
    }

    // Mark as viewed if pending
    if (lead.status === 'pending') {
      await supabase.rpc('mark_lead_viewed', {
        p_match_id: matchId,
        p_cleaner_id: cleaner.id,
      });
    }

    return {
      success: true,
      lead: {
        ...lead,
        quote_request: lead.quote_requests as unknown as LeadMatch['quote_request'],
      },
      credits: {
        lead_credits_remaining: cleaner.lead_credits_remaining,
        lead_credits_used_this_month: cleaner.lead_credits_used_this_month,
        lead_credits_reset_date: cleaner.lead_credits_reset_date,
        subscription_tier: cleaner.subscription_tier,
      },
    };
  } catch (error) {
    logger.error('Error in getLeadById', { function: 'getLeadById' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Respond to a lead with a quote
 */
export async function respondToLead(
  matchId: string,
  quoteAmount: number,
  availabilityDate: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, business_name, subscription_tier, lead_credits_remaining')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // Validate quote amount
    if (quoteAmount < 0 || quoteAmount > 100000) {
      return { success: false, error: 'Invalid quote amount' };
    }

    // Call RPC function to respond
    const { error: rpcError } = await supabase.rpc('respond_to_lead', {
      p_match_id: matchId,
      p_cleaner_id: cleaner.id,
      p_quote_amount: quoteAmount,
      p_availability_date: availabilityDate,
      p_message: message || null,
    });

    if (rpcError) {
      logger.error('Error responding to lead', { function: 'respondToLead' }, rpcError);
      if (rpcError.message.includes('No lead credits')) {
        return { success: false, error: 'No lead credits remaining. Upgrade your plan to respond to more leads.' };
      }
      if (rpcError.message.includes('already responded')) {
        return { success: false, error: 'You have already responded to this lead.' };
      }
      return { success: false, error: 'Failed to submit quote response' };
    }

    // Get quote request details for email
    const { data: match } = await supabase
      .from('lead_matches')
      .select(`
        id,
        quote_requests (
          contact_name,
          contact_email
        )
      `)
      .eq('id', matchId)
      .single();

    // Send email notification to customer (async, don't block)
    if (match?.quote_requests) {
      const quoteRequest = match.quote_requests as unknown as { contact_name: string; contact_email: string };
      sendQuoteResponseEmail({
        to: quoteRequest.contact_email,
        customerName: quoteRequest.contact_name,
        businessName: cleaner.business_name,
        quoteAmount,
        availabilityDate,
        message: message || null,
        quoteId: matchId,
      }).catch((err) => logger.error('Error sending quote response email', { function: 'respondToLead' }, err));
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in respondToLead', { function: 'respondToLead' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Decline a lead
 */
export async function declineLead(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // Call RPC function to decline
    const { error: rpcError } = await supabase.rpc('decline_lead', {
      p_match_id: matchId,
      p_cleaner_id: cleaner.id,
    });

    if (rpcError) {
      logger.error('Error declining lead', { function: 'declineLead' }, rpcError);
      return { success: false, error: 'Failed to decline lead' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in declineLead', { function: 'declineLead' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
