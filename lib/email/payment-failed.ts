/**
 * Payment Failed Email Service
 *
 * Sends dunning emails for failed payments at each retry stage.
 * Placeholder implementation - replace with actual email provider in production.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface PaymentFailedEmailData {
  to: string;
  businessName: string;
  attemptNumber: number;
  maxAttempts: number;
  gracePeriodEnd: string;
  invoiceId: string;
}

export interface FinalWarningEmailData {
  to: string;
  businessName: string;
  gracePeriodEnd: string;
}

export interface DowngradeEmailData {
  to: string;
  businessName: string;
  previousTier: string;
}

/**
 * Send payment failed notification email (attempts 1 and 2)
 */
export async function sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<boolean> {
  const formattedDate = new Date(data.gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  console.log('[EMAIL] Payment Failed Notification');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: Payment failed - Action required (Attempt ${data.attemptNumber}/${data.maxAttempts})`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Attempt: ${data.attemptNumber} of ${data.maxAttempts}`);
  console.log(`   Grace period ends: ${formattedDate}`);
  console.log(`   Invoice: ${data.invoiceId}`);
  console.log(`   Update payment: ${BASE_URL}/dashboard/cleaner/billing`);
  console.log('');

  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  // return await resend.emails.send({
  //   from: 'Boss of Clean <billing@bossofclean.com>',
  //   to: data.to,
  //   subject: `Payment failed - Action required (Attempt ${data.attemptNumber}/${data.maxAttempts})`,
  //   html: generatePaymentFailedHtml(data),
  // });

  return true;
}

/**
 * Send final warning email before downgrade
 */
export async function sendFinalWarningEmail(data: FinalWarningEmailData): Promise<boolean> {
  const formattedDate = new Date(data.gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  console.log('[EMAIL] Final Payment Warning');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: URGENT: Your subscription will be downgraded`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Downgrade date: ${formattedDate}`);
  console.log(`   Update payment: ${BASE_URL}/dashboard/cleaner/billing`);
  console.log('');

  // TODO: Replace with actual email provider
  // return await resend.emails.send({
  //   from: 'Boss of Clean <billing@bossofclean.com>',
  //   to: data.to,
  //   subject: 'URGENT: Your subscription will be downgraded',
  //   html: generateFinalWarningHtml(data),
  // });

  return true;
}

/**
 * Send downgrade notification email
 */
export async function sendDowngradeEmail(data: DowngradeEmailData): Promise<boolean> {
  console.log('[EMAIL] Subscription Downgraded');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: Your subscription has been downgraded to Free`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Previous tier: ${data.previousTier}`);
  console.log(`   Resubscribe: ${BASE_URL}/dashboard/cleaner/billing`);
  console.log('');

  // TODO: Replace with actual email provider
  // return await resend.emails.send({
  //   from: 'Boss of Clean <billing@bossofclean.com>',
  //   to: data.to,
  //   subject: 'Your subscription has been downgraded to Free',
  //   html: generateDowngradeHtml(data),
  // });

  return true;
}
