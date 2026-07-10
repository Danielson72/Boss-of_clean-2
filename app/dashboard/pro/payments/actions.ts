'use server';

import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/pro/payments/actions' });

/**
 * DLD-564: one row of the pro's payment history.
 * IMPORTANT: payments.amount stores DOLLARS (numeric), not cents — verified
 * against live rows (e.g. 30.00 for a lead unlock). Never divide by 100.
 */
export interface PaymentRow {
  id: string;
  /** dollars, as stored */
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  /** paid_at when present, else created_at */
  date: string;
  /** from payments.metadata — links a lead-unlock payment to its lead */
  quote_request_id: string | null;
  service_type: string | null;
  lead_city: string | null;
}

export async function getPaymentHistory(): Promise<{
  success: boolean;
  payments?: PaymentRow[];
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: pro } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!pro) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // RLS: payments_users_select_own (cleaner_id in own pros rows).
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, currency, status, description, metadata, paid_at, created_at')
      .eq('cleaner_id', pro.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      logger.error('Error fetching payments', { function: 'getPaymentHistory' }, error);
      return { success: false, error: 'Failed to load payment history' };
    }

    const payments: PaymentRow[] = (data || []).map((p) => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      return {
        id: p.id,
        amount: Number(p.amount), // dollars as stored — do NOT divide by 100
        currency: p.currency || 'usd',
        status: String(p.status),
        description: p.description ?? null,
        date: (p.paid_at as string | null) ?? (p.created_at as string),
        quote_request_id: typeof meta.quote_request_id === 'string' ? meta.quote_request_id : null,
        service_type: typeof meta.service_type === 'string' ? meta.service_type : null,
        lead_city: typeof meta.lead_city === 'string' ? meta.lead_city : null,
      };
    });

    return { success: true, payments };
  } catch (err) {
    logger.error('Unexpected error', { function: 'getPaymentHistory' }, err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
