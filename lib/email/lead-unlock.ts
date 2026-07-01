/**
 * Lead Unlock Email Notification Service
 *
 * Sends an email to a pro when they pay the $30 lead fee, releasing the
 * customer's contact info so the pro can get to work.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox } from './resend';

const logger = createLogger({ file: 'lib/email/lead-unlock' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface LeadContactEmailData {
  recipientEmail: string;
  proName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  serviceType: string;
  city: string;
}

/**
 * Generate HTML for the lead-unlocked notification email
 */
export function generateLeadContactHtml(
  data: LeadContactEmailData,
  leadsUrl: string
): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Your lead is unlocked</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.proName}, your payment cleared and the customer's contact details
      are now yours. Reach out soon — a fast response wins the job.
    </p>

    ${generateInfoBox([
      { label: 'Customer', value: data.customerName },
      { label: 'Phone', value: data.customerPhone || 'not provided' },
      { label: 'Email', value: data.customerEmail },
      { label: 'Service', value: (data.serviceType || '').replace(/_/g, ' ') },
      { label: 'City', value: data.city },
    ])}

    ${generateButton('View lead', leadsUrl)}

    <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 24px;">
      Save this contact and follow up directly with the customer.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send a lead-unlocked notification email to the pro
 */
export async function sendLeadContactEmail(
  data: LeadContactEmailData
): Promise<boolean> {
  const leadsUrl = `${BASE_URL}/dashboard/pro/leads`;

  logger.info('Sending lead unlock notification', {
    function: 'sendLeadContactEmail',
    to: data.recipientEmail,
  });

  const result = await sendResendEmail({
    to: data.recipientEmail,
    subject: 'Your lead is unlocked',
    html: generateLeadContactHtml(data, leadsUrl),
  });

  return result.success;
}
