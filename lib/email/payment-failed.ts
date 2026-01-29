/**
 * Payment Failed Email Service
 *
 * Sends dunning emails for failed payments at each retry stage.
 * Placeholder implementation - replace with actual email provider in production.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/email/payment-failed' });
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

  logger.info('[EMAIL] Payment Failed Notification');
  logger.info(`   To: ${data.to}`);
  logger.info(`   Subject: Payment failed - Action required (Attempt ${data.attemptNumber}/${data.maxAttempts})`);
  logger.info(`   Business: ${data.businessName}`);
  logger.info(`   Attempt: ${data.attemptNumber} of ${data.maxAttempts}`);
  logger.info(`   Grace period ends: ${formattedDate}`);
  logger.info(`   Invoice: ${data.invoiceId}`);
  logger.info(`   Update payment: ${BASE_URL}/dashboard/cleaner/billing`);
  logger.info('');

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

  logger.info('[EMAIL] Final Payment Warning');
  logger.info(`   To: ${data.to}`);
  logger.info(`   Subject: URGENT: Your subscription will be downgraded`);
  logger.info(`   Business: ${data.businessName}`);
  logger.info(`   Downgrade date: ${formattedDate}`);
  logger.info(`   Update payment: ${BASE_URL}/dashboard/cleaner/billing`);
  logger.info('');

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
  logger.info('[EMAIL] Subscription Downgraded');
  logger.info(`   To: ${data.to}`);
  logger.info(`   Subject: Your subscription has been downgraded to Free`);
  logger.info(`   Business: ${data.businessName}`);
  logger.info(`   Previous tier: ${data.previousTier}`);
  logger.info(`   Resubscribe: ${BASE_URL}/dashboard/cleaner/billing`);
  logger.info('');

  // TODO: Replace with actual email provider
  // return await resend.emails.send({
  //   from: 'Boss of Clean <billing@bossofclean.com>',
  //   to: data.to,
  //   subject: 'Your subscription has been downgraded to Free',
  //   html: generateDowngradeHtml(data),
  // });

  return true;
}
