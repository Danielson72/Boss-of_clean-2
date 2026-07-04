/**
 * Lead Unlock Email Notification Service
 *
 * Sends an email to a pro when they pay the $30 lead fee, releasing the
 * customer's contact info so the pro can get to work.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox, escapeHtml, ALERTS_FROM } from './resend';

const logger = createLogger({ file: 'lib/email/lead-unlock' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';
const ADMIN_EMAIL = 'admin@bossofclean.com';

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
      Hi ${escapeHtml(data.proName)}, your payment cleared and the customer's contact details
      are now yours. Reach out soon — a fast response wins the job.
    </p>

    ${generateInfoBox([
      { label: 'Customer', value: escapeHtml(data.customerName) },
      { label: 'Phone', value: escapeHtml(data.customerPhone || 'not provided') },
      { label: 'Email', value: escapeHtml(data.customerEmail) },
      { label: 'Service', value: escapeHtml((data.serviceType || '').replace(/_/g, ' ')) },
      { label: 'City', value: escapeHtml(data.city) },
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

export interface AdminSaleEmailData {
  proName: string;
  customerName: string;
  serviceType: string;
  city: string;
  /** dollars — the lead-unlock fee that just cleared */
  amount: number;
  paymentIntentId: string;
}

/**
 * Generate HTML for the internal "new sale" admin alert.
 * All interpolated values pass through escapeHtml (AUDIT_2026-07 flag).
 */
export function generateAdminSaleHtml(data: AdminSaleEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">💰 New Sale — $30 Lead Capture</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      A pro just paid to unlock a lead. Payment cleared in Stripe.
    </p>

    ${generateInfoBox([
      { label: 'Pro', value: escapeHtml(data.proName) },
      { label: 'Customer', value: escapeHtml(data.customerName) },
      { label: 'Service', value: escapeHtml((data.serviceType || '').replace(/_/g, ' ')) },
      { label: 'City', value: escapeHtml(data.city) },
      { label: 'Amount', value: escapeHtml(`$${data.amount.toFixed(2)}`) },
      { label: 'Payment Intent', value: escapeHtml(data.paymentIntentId) },
    ])}
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send the internal "new sale" alert to the Boss of Clean admin inbox.
 * Fire-and-forget from the webhook — a mail failure must never fail the
 * webhook or the payments write.
 */
export async function sendAdminSaleNotification(
  data: AdminSaleEmailData
): Promise<boolean> {
  logger.info('Sending admin sale notification', {
    function: 'sendAdminSaleNotification',
    paymentIntentId: data.paymentIntentId,
  });

  const result = await sendResendEmail({
    to: ADMIN_EMAIL,
    subject: '💰 New Sale — $30 Lead Capture',
    html: generateAdminSaleHtml(data),
    from: ALERTS_FROM,
  });

  return result.success;
}
