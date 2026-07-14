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
export function generateNewLeadEmailHtml(data: NewLeadEmailData): string {
  const service = data.serviceType?.replace(/_/g, ' ') || 'service';
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">New Lead Alert!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, a customer in your area is looking for ${service} services!
    </p>

    ${generateInfoBox([
      { label: 'Service Type', value: service },
      { label: 'Location', value: data.zipCode },
      { label: 'Preferred Date', value: data.preferredDate || 'Flexible' },
    ])}

    ${generateButton('View Lead Details', `${BASE_URL}/dashboard/pro/quote-requests`)}

    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Act fast!</strong> This lead will be available to other pros in your area. Respond quickly for the best chance at winning the job.
      </p>
    </div>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate quote response email HTML
 */
export function generateQuoteResponseEmailHtml(data: QuoteResponseEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">You've Received a Quote!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, <strong>${data.businessName}</strong> has responded to your quote request.
    </p>

    ${generateInfoBox([
      { label: 'Quoted Price', value: `$${data.quoteAmount}` },
      { label: 'Availability', value: data.availabilityDate || 'Contact for details' },
    ])}

    ${data.message ? `
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #FF5F1F;">
        <p style="margin: 0; font-weight: 600; color: #374151;">Message from ${data.businessName}:</p>
        <p style="margin: 8px 0 0 0; color: #4b5563; font-style: italic;">"${data.message}"</p>
      </div>
    ` : ''}

    ${generateButton('View Quote & Book', `${BASE_URL}/dashboard/customer`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Compare quotes from multiple pros to find the best fit for your needs.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate quote confirmation email HTML
 */
export function generateQuoteConfirmationEmailHtml(data: QuoteConfirmationEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Quote Request Submitted!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, your quote request has been sent to <strong>${data.matchCount}</strong> pros in your area.
    </p>

    <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>What happens next?</strong><br>
        Pros will review your request and send you personalized quotes. You'll receive an email each time a pro responds.
      </p>
    </div>

    ${generateButton('Check Quote Status', `${BASE_URL}/dashboard/customer`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Most pros respond within 24 hours. You can view and compare all quotes from your dashboard.
    </p>
  `;

  return wrapEmailTemplate(content);
}

export interface QuoteAcceptedProEmailData {
  to: string;
  businessName: string;
  quoteAmount: number;
  quoteId: string;
}

export interface QuoteAcceptedCustomerEmailData {
  to: string;
  customerName: string;
  businessName: string;
  quoteAmount: number;
}

/**
 * Generate "your quote was accepted" email for the pro.
 * Neutral-marketplace copy: BOC facilitates the introduction; the lead fee
 * unlocks contact info. No guarantees about the job.
 */
export function generateQuoteAcceptedProEmailHtml(data: QuoteAcceptedProEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Your quote was accepted!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, a customer accepted your quote of <strong>$${data.quoteAmount}</strong>.
    </p>

    <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>Next step:</strong> pay the $30 lead fee to unlock the customer's contact
        details, then reach out to arrange the job directly. The lead fee is for the
        introduction only.
      </p>
    </div>

    ${generateButton('Unlock Contact & Respond', `${BASE_URL}/dashboard/pro/leads`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      You set your own prices and arrange the work directly with the customer. Boss of
      Clean is a marketplace that connects you — it is not a party to the job.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate "you accepted a quote" confirmation for the customer.
 * Neutral-marketplace copy: explains what happens next without any guarantee or
 * vetting claim.
 */
export function generateQuoteAcceptedCustomerEmailHtml(data: QuoteAcceptedCustomerEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">You accepted a quote</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, you accepted <strong>${data.businessName}</strong>'s quote of
      <strong>$${data.quoteAmount}</strong>.
    </p>

    <div style="background: #FFF3EC; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #FF5F1F;">
      <p style="margin: 0; color: #9A3A12; font-size: 14px;">
        <strong>What happens next?</strong><br>
        ${data.businessName} will receive your contact information and reach out to
        arrange the details directly with you. You and the pro agree on scheduling,
        payment for the service, and any other terms between yourselves.
      </p>
    </div>

    ${generateButton('View in Your Dashboard', `${BASE_URL}/dashboard/customer`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Boss of Clean is a marketplace that connects you with independent professionals.
      Please confirm licensing and insurance directly with the pro before work begins.
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
    subject: `New ${data.serviceType?.replace(/_/g, ' ') || 'service'} lead in ${data.zipCode}!`,
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
    subject: 'Your quote request has been submitted!',
    html: generateQuoteConfirmationEmailHtml(data),
  });

  return result.success;
}

/**
 * Send "your quote was accepted" email to the pro.
 */
export async function sendQuoteAcceptedProEmail(data: QuoteAcceptedProEmailData): Promise<boolean> {
  logger.info('Sending quote-accepted (pro) notification', {
    function: 'sendQuoteAcceptedProEmail',
    to: data.to,
    quoteId: data.quoteId,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: 'Your quote was accepted — unlock the customer contact',
    html: generateQuoteAcceptedProEmailHtml(data),
  });

  return result.success;
}

/**
 * Send "you accepted a quote" confirmation email to the customer.
 */
export async function sendQuoteAcceptedCustomerEmail(data: QuoteAcceptedCustomerEmailData): Promise<boolean> {
  logger.info('Sending quote-accepted (customer) confirmation', {
    function: 'sendQuoteAcceptedCustomerEmail',
    to: data.to,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: `You accepted ${data.businessName}'s quote`,
    html: generateQuoteAcceptedCustomerEmailHtml(data),
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

    ${generateButton('View & Respond', `${BASE_URL}/dashboard/pro/quote-requests`)}

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
