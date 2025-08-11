import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface QuoteRequest {
  id: string;
  customer_id: string;
  cleaner_id?: string;
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date?: string;
  preferred_time?: string;
  flexible_scheduling: boolean;
  zip_code: string;
  address?: string;
  city?: string;
  special_instructions?: string;
  estimated_hours?: number;
  budget_range?: string;
  status: 'pending' | 'responded' | 'accepted' | 'completed' | 'cancelled';
  customer_message?: string;
  cleaner_response?: string;
  quoted_price?: number;
  contact_method: string;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
  customer?: {
    full_name: string;
    email: string;
    phone: string;
  };
  cleaner?: {
    business_name: string;
    business_phone: string;
    business_email: string;
    average_rating: number;
    hourly_rate: number;
  };
}

export interface CreateQuoteRequestData {
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date?: string;
  preferred_time?: string;
  flexible_scheduling?: boolean;
  zip_code: string;
  address?: string;
  city?: string;
  special_instructions?: string;
  estimated_hours?: number;
  budget_range?: string;
  customer_message?: string;
  contact_method?: string;
  urgent?: boolean;
}

export class QuoteService {
  private supabase = createClient();

  async createQuoteRequest(customerId: string, data: CreateQuoteRequestData): Promise<QuoteRequest> {
    const quoteData = {
      customer_id: customerId,
      ...data,
      contact_method: data.contact_method || 'email',
      urgent: data.urgent || false,
      flexible_scheduling: data.flexible_scheduling || false,
      status: 'pending' as const,
    };

    const { data: quote, error } = await this.supabase
      .from('quote_requests')
      .insert(quoteData)
      .select(`
        *,
        customer:users!customer_id(full_name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Error creating quote request:', error);
      throw new Error('Failed to create quote request');
    }

    // Send notifications to cleaners in the area
    await this.notifyCleanersInArea(quote.zip_code, quote.service_type, quote.id);

    return quote;
  }

  async getQuoteRequestsForCustomer(customerId: string): Promise<QuoteRequest[]> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .select(`
        *,
        cleaner:cleaners(business_name, business_phone, business_email, average_rating, hourly_rate)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer quotes:', error);
      throw new Error('Failed to fetch quote requests');
    }

    return data || [];
  }

  async getQuoteRequestsForCleaner(cleanerId: string): Promise<QuoteRequest[]> {
    // Get quotes in cleaner's service areas
    const { data: serviceAreas } = await this.supabase
      .from('cleaner_service_areas')
      .select('zip_code')
      .eq('cleaner_id', cleanerId);

    if (!serviceAreas?.length) {
      return [];
    }

    const zipCodes = serviceAreas.map(area => area.zip_code);

    const { data, error } = await this.supabase
      .from('quote_requests')
      .select(`
        *,
        customer:users!customer_id(full_name, email, phone)
      `)
      .in('zip_code', zipCodes)
      .in('status', ['pending', 'responded'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cleaner quotes:', error);
      throw new Error('Failed to fetch quote requests');
    }

    return data || [];
  }

  async respondToQuote(
    quoteId: string,
    cleanerId: string,
    response: string,
    quotedPrice?: number
  ): Promise<QuoteRequest> {
    const updateData: any = {
      cleaner_id: cleanerId,
      cleaner_response: response,
      status: 'responded',
      updated_at: new Date().toISOString(),
    };

    if (quotedPrice) {
      updateData.quoted_price = quotedPrice;
    }

    const { data, error } = await this.supabase
      .from('quote_requests')
      .update(updateData)
      .eq('id', quoteId)
      .select(`
        *,
        customer:users!customer_id(full_name, email, phone),
        cleaner:cleaners(business_name, business_phone, business_email, average_rating)
      `)
      .single();

    if (error) {
      console.error('Error responding to quote:', error);
      throw new Error('Failed to respond to quote');
    }

    // Send email notification to customer
    await this.sendQuoteResponseNotification(data);

    return data;
  }

  async acceptQuote(quoteId: string, customerId: string): Promise<QuoteRequest> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('customer_id', customerId)
      .select(`
        *,
        cleaner:cleaners(business_name, business_phone, business_email)
      `)
      .single();

    if (error) {
      console.error('Error accepting quote:', error);
      throw new Error('Failed to accept quote');
    }

    // Send notification to cleaner
    await this.sendQuoteAcceptedNotification(data);

    return data;
  }

  async markQuoteCompleted(quoteId: string, cleanerId: string): Promise<QuoteRequest> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('cleaner_id', cleanerId)
      .select()
      .single();

    if (error) {
      console.error('Error marking quote completed:', error);
      throw new Error('Failed to mark quote as completed');
    }

    return data;
  }

  async cancelQuote(quoteId: string, userId: string): Promise<QuoteRequest> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .or(`customer_id.eq.${userId},cleaner_id.eq.${userId}`)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling quote:', error);
      throw new Error('Failed to cancel quote');
    }

    return data;
  }

  private async notifyCleanersInArea(zipCode: string, serviceType: string, quoteId: string) {
    try {
      // Get cleaners who serve this area and offer this service
      const { data: cleaners } = await this.supabase
        .from('cleaners')
        .select(`
          id,
          user_id,
          business_name,
          services,
          users!user_id(email, full_name)
        `)
        .eq('approval_status', 'approved')
        .contains('services', [serviceType])
        .in('id', 
          // Subquery to get cleaners serving this ZIP code
          (await this.supabase
            .from('cleaner_service_areas')
            .select('cleaner_id')
            .eq('zip_code', zipCode)
          ).data?.map(area => area.cleaner_id) || []
        );

      // Send email notifications (this would integrate with your email service)
      for (const cleaner of cleaners || []) {
        await this.sendQuoteNotificationEmail(cleaner, quoteId);
      }
    } catch (error) {
      console.error('Error notifying cleaners:', error);
    }
  }

  private async sendQuoteNotificationEmail(cleaner: any, quoteId: string) {
    // This would integrate with your email service (SendGrid, Resend, etc.)
    console.log(`Sending quote notification to ${cleaner.business_name} for quote ${quoteId}`);
    
    // Example: Add to email queue or send immediately
    // await emailService.sendQuoteNotification({
    //   to: cleaner.users.email,
    //   businessName: cleaner.business_name,
    //   quoteId: quoteId
    // });
  }

  private async sendQuoteResponseNotification(quote: QuoteRequest) {
    console.log(`Sending quote response notification to customer ${quote.customer?.full_name}`);
    // Implement email notification to customer
  }

  private async sendQuoteAcceptedNotification(quote: QuoteRequest) {
    console.log(`Sending quote accepted notification to cleaner ${quote.cleaner?.business_name}`);
    // Implement email notification to cleaner
  }

  async getQuoteById(quoteId: string): Promise<QuoteRequest | null> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .select(`
        *,
        customer:users!customer_id(full_name, email, phone),
        cleaner:cleaners(business_name, business_phone, business_email, average_rating, hourly_rate)
      `)
      .eq('id', quoteId)
      .single();

    if (error) {
      console.error('Error fetching quote:', error);
      return null;
    }

    return data;
  }

  // Analytics methods
  async getQuoteStats(cleanerId?: string, customerId?: string) {
    let query = this.supabase.from('quote_requests').select('status, created_at');

    if (cleanerId) {
      query = query.eq('cleaner_id', cleanerId);
    }
    
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data } = await query;

    if (!data) return null;

    return {
      total: data.length,
      pending: data.filter(q => q.status === 'pending').length,
      responded: data.filter(q => q.status === 'responded').length,
      accepted: data.filter(q => q.status === 'accepted').length,
      completed: data.filter(q => q.status === 'completed').length,
      cancelled: data.filter(q => q.status === 'cancelled').length,
    };
  }
}

export const quoteService = new QuoteService();