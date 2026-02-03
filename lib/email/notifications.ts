/**
 * Email Notification Service
 *
 * Handles lead and quote notification emails.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox } from './resend';

const logger = createLogger({ file: 'lib/email/notifications' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface NewLeadEmailData {
  to: string;
  businessName: string;
  serviceType: string;
  zipCode: string;
  preferredDate?: string | null;
  leadId: string;
}

export interface QuoteResponseEmailData {
  to: string;
  customerName: string;
  businessName: string;
  quoteAmount: number;
  availabilityDate?: string | null;
  message?: string | null;
  quoteId: string;
}

export interface QuoteConfirmationEmailData {
  to: string;
  customerName: string;
  quoteId: string;
  matchCount: number;
}

/**
 * Generate new lead email HTML
 */
function generateNewLeadEmailHtml(data: NewLeadEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">New Lead Alert!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, a customer in your area is looking for cleaning services!
    </p>

    ${generateInfoBox([
      { label: 'Service Type', value: data.serviceType.replace(/_/g, ' ') },
      { label: 'Location', value: data.zipCode },
      { label: 'Preferred Date', value: data.preferredDate || 'Flexible' },
    ])}

    ${generateButton('View Lead Details', `${BASE_URL}/dashboard/cleaner/leads/${data.leadId}`)}

    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Act fast!</strong> This lead will be available to other cleaners in your area. Respond quickly for the best chance at winning the job.
      </p>
    </div>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate quote response email HTML
 */
function generateQuoteResponseEmailHtml(data: QuoteResponseEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">You've Received a Quote!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, <strong>${data.businessName}</strong> has responded to your cleaning request.
    </p>

    ${generateInfoBox([
      { label: 'Quoted Price', value: `$${data.quoteAmount}` },
      { label: 'Availability', value: data.availabilityDate || 'Contact for details' },
    ])}

    ${data.message ? `
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-weight: 600; color: #374151;">Message from ${data.businessName}:</p>
        <p style="margin: 8px 0 0 0; color: #4b5563; font-style: italic;">"${data.message}"</p>
      </div>
    ` : ''}

    ${generateButton('View Quote & Book', `${BASE_URL}/quote-request/status?id=${data.quoteId}`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Compare quotes from multiple cleaners to find the best fit for your needs.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate quote confirmation email HTML
 */
function generateQuoteConfirmationEmailHtml(data: QuoteConfirmationEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Quote Request Submitted!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, your cleaning quote request has been sent to <strong>${data.matchCount}</strong> qualified cleaners in your area.
    </p>

    <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>What happens next?</strong><br>
        Cleaners will review your request and send you personalized quotes. You'll receive an email each time a cleaner responds.
      </p>
    </div>

    ${generateButton('Check Quote Status', `${BASE_URL}/quote-request/status?id=${data.quoteId}`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Most cleaners respond within 24 hours. You can view and compare all quotes from your dashboard.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send email notification to cleaner about new lead
 */
export async function sendNewLeadEmail(data: NewLeadEmailData): Promise<boolean> {
  logger.info('Sending new lead notification', {
    function: 'sendNewLeadEmail',
    to: data.to,
    leadId: data.leadId,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: `New cleaning lead in ${data.zipCode}!`,
    html: generateNewLeadEmailHtml(data),
  });

  return result.success;
}

/**
 * Send email notification to customer when cleaner responds
 */
export async function sendQuoteResponseEmail(data: QuoteResponseEmailData): Promise<boolean> {
  logger.info('Sending quote response notification', {
    function: 'sendQuoteResponseEmail',
    to: data.to,
    quoteId: data.quoteId,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: `${data.businessName} sent you a quote!`,
    html: generateQuoteResponseEmailHtml(data),
  });

  return result.success;
}

/**
 * Send confirmation email to customer after quote submission
 */
export async function sendQuoteConfirmationEmail(data: QuoteConfirmationEmailData): Promise<boolean> {
  logger.info('Sending quote confirmation', {
    function: 'sendQuoteConfirmationEmail',
    to: data.to,
    quoteId: data.quoteId,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: 'Your cleaning quote request has been submitted!',
    html: generateQuoteConfirmationEmailHtml(data),
  });

  return result.success;
}

/**
 * Send email notification to cleaner about quote match
 */
export async function sendQuoteMatchEmail(data: {
  to: string;
  businessName: string;
  serviceType: string;
  location: string;
  quoteId: string;
}): Promise<boolean> {
  logger.info('Sending quote match notification', {
    function: 'sendQuoteMatchEmail',
    to: data.to,
    quoteId: data.quoteId,
  });

  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">New Quote Request!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, a customer in <strong>${data.location}</strong> is requesting quotes for <strong>${data.serviceType.replace(/_/g, ' ')}</strong>.
    </p>

    ${generateButton('View & Respond', `${BASE_URL}/dashboard/cleaner/quote-requests/${data.quoteId}`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Respond quickly to increase your chances of winning this job!
    </p>
  `;

  const result = await sendResendEmail({
    to: data.to,
    subject: 'New quote request in your area!',
    html: wrapEmailTemplate(content),
  });

  return result.success;
}
