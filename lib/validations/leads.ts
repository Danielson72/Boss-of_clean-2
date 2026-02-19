import { z } from 'zod';

export const unlockLeadSchema = z.object({
  quote_request_id: z.string().uuid('Invalid quote_request_id format'),
});

export const refundLeadSchema = z.object({
  lead_unlock_id: z.string().uuid('Invalid lead_unlock_id format'),
  reason: z.enum([
    'wrong_contact_info',
    'outside_service_area',
    'not_a_real_lead',
    'duplicate_lead',
    'customer_cancelled_before_contact',
    'other',
  ]),
  evidence: z.string().max(2000).optional(),
});
