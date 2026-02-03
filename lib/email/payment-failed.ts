/**
 * Payment Failed Email Service
 *
 * Sends dunning emails for failed payments at each retry stage.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox, BILLING_FROM } from './resend';

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
 * Generate payment failed email HTML
 */
function generatePaymentFailedHtml(data: PaymentFailedEmailData): string {
  const formattedDate = new Date(data.gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const content = `
    <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 8px 0;">Payment Failed</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, we were unable to process your subscription payment.
    </p>

    ${generateInfoBox([
      { label: 'Attempt', value: `${data.attemptNumber} of ${data.maxAttempts}` },
      { label: 'Invoice', value: data.invoiceId },
      { label: 'Action Required By', value: formattedDate },
    ])}

    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>What happens next?</strong><br>
        We'll automatically retry your payment. To avoid service interruption, please update your payment method before ${formattedDate}.
      </p>
    </div>

    ${generateButton('Update Payment Method', `${BASE_URL}/dashboard/cleaner/billing`, 'warning')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      If you believe this is an error, please check with your bank or contact our support team.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate final warning email HTML
 */
function generateFinalWarningHtml(data: FinalWarningEmailData): string {
  const formattedDate = new Date(data.gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const content = `
    <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 8px 0;">URGENT: Subscription at Risk</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, this is your final notice before your subscription is downgraded.
    </p>

    <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #dc2626;">
      <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: bold; text-align: center;">
        Your subscription will be downgraded to Free on ${formattedDate}
      </p>
    </div>

    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
      <strong>What you'll lose:</strong>
    </p>
    <ul style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
      <li>Priority placement in search results</li>
      <li>Unlimited lead credits</li>
      <li>Featured listing badge</li>
      <li>Advanced analytics</li>
    </ul>

    ${generateButton('Update Payment Now', `${BASE_URL}/dashboard/cleaner/billing`, 'warning')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Questions? Reply to this email or contact support. We're here to help!
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate downgrade notification email HTML
 */
function generateDowngradeHtml(data: DowngradeEmailData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Subscription Downgraded</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, your subscription has been downgraded from <strong>${data.previousTier}</strong> to <strong>Free</strong> due to payment issues.
    </p>

    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; color: #374151; font-weight: 600;">Your Free plan includes:</p>
      <ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px;">
        <li>Basic listing in search results</li>
        <li>5 lead credits per month</li>
        <li>1 portfolio photo</li>
      </ul>
    </div>

    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
      Ready to get back to growing your business? Resubscribe anytime to restore your premium features.
    </p>

    ${generateButton('Resubscribe Now', `${BASE_URL}/dashboard/cleaner/billing`, 'success')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      We hope to see you back soon!
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send payment failed notification email (attempts 1 and 2)
 */
export async function sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<boolean> {
  logger.info('Sending payment failed notification', {
    function: 'sendPaymentFailedEmail',
    to: data.to,
    attempt: data.attemptNumber,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: `Payment failed - Action required (Attempt ${data.attemptNumber}/${data.maxAttempts})`,
    html: generatePaymentFailedHtml(data),
    from: BILLING_FROM,
  });

  return result.success;
}

/**
 * Send final warning email before downgrade
 */
export async function sendFinalWarningEmail(data: FinalWarningEmailData): Promise<boolean> {
  logger.info('Sending final payment warning', {
    function: 'sendFinalWarningEmail',
    to: data.to,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: 'URGENT: Your subscription will be downgraded',
    html: generateFinalWarningHtml(data),
    from: BILLING_FROM,
  });

  return result.success;
}

/**
 * Send downgrade notification email
 */
export async function sendDowngradeEmail(data: DowngradeEmailData): Promise<boolean> {
  logger.info('Sending downgrade notification', {
    function: 'sendDowngradeEmail',
    to: data.to,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: 'Your subscription has been downgraded to Free',
    html: generateDowngradeHtml(data),
    from: BILLING_FROM,
  });

  return result.success;
}
