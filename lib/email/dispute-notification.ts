/**
 * Dispute Notification Email Service
 *
 * Sends email notifications for Stripe charge disputes.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox, ALERTS_FROM, BILLING_FROM } from './resend';

const logger = createLogger({ file: 'lib/email/dispute-notification' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bossofclean.com';

export interface DisputeAdminAlertData {
  disputeId: string;
  cleanerName: string;
  cleanerEmail: string;
  cleanerId: string;
  amount: number;
  currency: string;
  reason: string;
  chargeId: string;
}

export interface DisputeCleanerNotifyData {
  to: string;
  businessName: string;
  disputeId: string;
  amount: number;
  currency: string;
  reason: string;
  evidenceDueBy: string | null;
}

export interface DisputeResolvedData {
  to: string;
  businessName: string;
  disputeId: string;
  amount: number;
  currency: string;
  outcome: 'won' | 'lost';
}

/**
 * Generate admin alert email HTML
 */
function generateAdminAlertHtml(data: DisputeAdminAlertData): string {
  const amountFormatted = (data.amount / 100).toFixed(2);

  const content = `
    <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 8px 0;">Stripe Dispute Alert</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      A payment dispute has been filed against a cleaner on the platform.
    </p>

    ${generateInfoBox([
      { label: 'Dispute ID', value: data.disputeId },
      { label: 'Cleaner', value: `${data.cleanerName} (${data.cleanerEmail})` },
      { label: 'Amount', value: `$${amountFormatted} ${data.currency.toUpperCase()}` },
      { label: 'Reason', value: data.reason },
      { label: 'Charge ID', value: data.chargeId },
    ])}

    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Action Required:</strong> Review this dispute in the Stripe dashboard and gather evidence to respond.
      </p>
    </div>

    ${generateButton('View in Admin Dashboard', `${BASE_URL}/dashboard/admin`, 'warning')}
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate cleaner dispute notification HTML
 */
function generateCleanerDisputeHtml(data: DisputeCleanerNotifyData): string {
  const amountFormatted = (data.amount / 100).toFixed(2);
  const dueDate = data.evidenceDueBy
    ? new Date(data.evidenceDueBy).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const content = `
    <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 8px 0;">Payment Dispute Notice</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, a customer has filed a dispute for one of your payments.
    </p>

    ${generateInfoBox([
      { label: 'Dispute ID', value: data.disputeId },
      { label: 'Amount', value: `$${amountFormatted} ${data.currency.toUpperCase()}` },
      { label: 'Reason', value: data.reason },
      { label: 'Evidence Due By', value: dueDate },
    ])}

    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>What this means:</strong> The disputed amount has been temporarily held. We'll work with you to resolve this dispute.
      </p>
    </div>

    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
      <strong>What you can do:</strong>
    </p>
    <ul style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
      <li>Gather any documentation related to this service (photos, messages, signed agreements)</li>
      <li>Prepare a clear explanation of the service provided</li>
      <li>Our team will contact you if we need additional information</li>
    </ul>

    ${generateButton('View Account Details', `${BASE_URL}/dashboard/cleaner/billing`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Questions? Reply to this email and our support team will assist you.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate dispute resolved notification HTML
 */
function generateDisputeResolvedHtml(data: DisputeResolvedData): string {
  const amountFormatted = (data.amount / 100).toFixed(2);
  const isWon = data.outcome === 'won';

  const content = `
    <h2 style="color: ${isWon ? '#16a34a' : '#dc2626'}; font-size: 24px; margin: 0 0 8px 0;">
      Dispute ${isWon ? 'Resolved in Your Favor' : 'Resolved'}
    </h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, the payment dispute has been resolved.
    </p>

    <div style="background: ${isWon ? '#ecfdf5' : '#fef2f2'}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid ${isWon ? '#16a34a' : '#dc2626'};">
      <p style="margin: 0; color: ${isWon ? '#065f46' : '#991b1b'}; font-size: 18px; font-weight: bold;">
        ${isWon ? 'You Won!' : 'Dispute Lost'}
      </p>
      <p style="margin: 8px 0 0 0; color: ${isWon ? '#047857' : '#b91c1c'}; font-size: 24px; font-weight: bold;">
        $${amountFormatted}
      </p>
      <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
        ${isWon ? 'The funds have been returned to your account.' : 'The disputed amount has been refunded to the customer.'}
      </p>
    </div>

    ${isWon ? `
      <p style="color: #6b7280; font-size: 14px;">
        Great job providing the evidence needed to resolve this dispute! Keep maintaining excellent service records.
      </p>
    ` : `
      <p style="color: #6b7280; font-size: 14px;">
        We understand this is disappointing. To prevent future disputes, ensure clear communication with customers and document all services provided.
      </p>
    `}

    ${generateButton('View Billing Details', `${BASE_URL}/dashboard/cleaner/billing`)}
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send dispute alert to admin
 */
export async function sendDisputeAdminAlert(data: DisputeAdminAlertData): Promise<boolean> {
  logger.info('Sending dispute admin alert', {
    function: 'sendDisputeAdminAlert',
    disputeId: data.disputeId,
    cleanerId: data.cleanerId,
  });

  const amountFormatted = (data.amount / 100).toFixed(2);

  const result = await sendResendEmail({
    to: ADMIN_EMAIL,
    subject: `ALERT: Stripe Dispute - ${data.cleanerName} ($${amountFormatted})`,
    html: generateAdminAlertHtml(data),
    from: ALERTS_FROM,
  });

  return result.success;
}

/**
 * Notify cleaner about a new dispute on their account
 */
export async function sendDisputeCleanerNotification(data: DisputeCleanerNotifyData): Promise<boolean> {
  logger.info('Sending dispute notification to cleaner', {
    function: 'sendDisputeCleanerNotification',
    to: data.to,
    disputeId: data.disputeId,
  });

  const result = await sendResendEmail({
    to: data.to,
    subject: 'Payment Dispute on Your Account - Action Required',
    html: generateCleanerDisputeHtml(data),
    from: BILLING_FROM,
  });

  return result.success;
}

/**
 * Notify cleaner about dispute resolution
 */
export async function sendDisputeResolvedNotification(data: DisputeResolvedData): Promise<boolean> {
  logger.info('Sending dispute resolved notification', {
    function: 'sendDisputeResolvedNotification',
    to: data.to,
    disputeId: data.disputeId,
    outcome: data.outcome,
  });

  const amountFormatted = (data.amount / 100).toFixed(2);

  const result = await sendResendEmail({
    to: data.to,
    subject: `Dispute ${data.outcome === 'won' ? 'Won' : 'Lost'} - $${amountFormatted}`,
    html: generateDisputeResolvedHtml(data),
    from: BILLING_FROM,
  });

  return result.success;
}
