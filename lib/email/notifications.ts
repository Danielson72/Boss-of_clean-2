/**
 * Email Notification Service
 *
 * Placeholder implementation for email notifications.
 * Replace with actual email provider (Resend, SendGrid, etc.) in production.
 */

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
 * Send email notification to cleaner about new lead
 */
export async function sendNewLeadEmail(data: NewLeadEmailData): Promise<boolean> {
  // TODO: Replace with actual email provider implementation
  console.log('📧 [EMAIL] New Lead Notification');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: New cleaning lead in ${data.zipCode}!`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Service: ${data.serviceType}`);
  console.log(`   Date: ${data.preferredDate || 'Flexible'}`);
  console.log(`   Lead URL: ${BASE_URL}/dashboard/cleaner/leads/${data.leadId}`);
  console.log('');

  // In production, implement actual email sending:
  // return await resend.emails.send({
  //   from: 'Boss of Clean <leads@bossofclean.com>',
  //   to: data.to,
  //   subject: `New cleaning lead in ${data.zipCode}!`,
  //   html: generateNewLeadEmailHtml(data),
  // });

  return true;
}

/**
 * Send email notification to customer when cleaner responds
 */
export async function sendQuoteResponseEmail(data: QuoteResponseEmailData): Promise<boolean> {
  // TODO: Replace with actual email provider implementation
  console.log('📧 [EMAIL] Quote Response Notification');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: ${data.businessName} sent you a quote!`);
  console.log(`   Customer: ${data.customerName}`);
  console.log(`   Quote Amount: $${data.quoteAmount}`);
  console.log(`   Availability: ${data.availabilityDate || 'Contact for details'}`);
  console.log(`   View URL: ${BASE_URL}/quote-request/status?id=${data.quoteId}`);
  console.log('');

  return true;
}

/**
 * Send confirmation email to customer after quote submission
 */
export async function sendQuoteConfirmationEmail(data: QuoteConfirmationEmailData): Promise<boolean> {
  // TODO: Replace with actual email provider implementation
  console.log('📧 [EMAIL] Quote Confirmation');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: Your cleaning quote request has been submitted!`);
  console.log(`   Customer: ${data.customerName}`);
  console.log(`   Quote ID: ${data.quoteId}`);
  console.log(`   Matched Cleaners: ${data.matchCount}`);
  console.log(`   Status URL: ${BASE_URL}/quote-request/status?id=${data.quoteId}`);
  console.log('');

  return true;
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
  console.log('📧 [EMAIL] Quote Match Notification');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: New quote request in your area!`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Service: ${data.serviceType}`);
  console.log(`   Location: ${data.location}`);
  console.log('');

  return true;
}

// Email HTML templates (for future implementation)
function generateNewLeadEmailHtml(data: NewLeadEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Lead - Boss of Clean</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🐱 Boss of Clean</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Purrfection is our Standard</p>
      </div>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1f2937; margin-top: 0;">New Lead Alert! 🎉</h2>

        <p>Hi ${data.businessName},</p>

        <p>Great news! A customer in <strong>${data.zipCode}</strong> is looking for <strong>${data.serviceType}</strong> services.</p>

        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceType}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${data.zipCode}</p>
          <p style="margin: 5px 0;"><strong>Preferred Date:</strong> ${data.preferredDate || 'Flexible'}</p>
        </div>

        <a href="${BASE_URL}/dashboard/cleaner/leads/${data.leadId}"
           style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Lead Details
        </a>

        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          This lead will expire in 48 hours. Respond quickly for the best chance at winning the job!
        </p>
      </div>
    </body>
    </html>
  `;
}
