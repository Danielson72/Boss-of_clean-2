import { z } from 'zod';

export const unlockLeadSchema = z.object({
  quote_request_id: z.string().uuid('Invalid quote_request_id format'),
});
