/**
 * Dispute Notification Email Service
 *
 * Sends email notifications for Stripe charge disputes.
 * Placeholder implementation - replace with actual email provider in production.
 */

import { createLogger } from '../utils/logger';

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
 * Send dispute alert to admin
 */
export async function sendDisputeAdminAlert(data: DisputeAdminAlertData): Promise<boolean> {
  const amountFormatted = (data.amount / 100).toFixed(2);

  logger.info('[EMAIL] Dispute Alert - Admin Notification');
  logger.info(`   To: ${ADMIN_EMAIL}`);
  logger.info(`   Subject: ALERT: Stripe Dispute - ${data.cleanerName} ($${amountFormatted})`);
  logger.info(`   Dispute ID: ${data.disputeId}`);
  logger.info(`   Cleaner: ${data.cleanerName} (${data.cleanerEmail})`);
  logger.info(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  logger.info(`   Reason: ${data.reason}`);
  logger.info(`   Charge: ${data.chargeId}`);
  logger.info(`   Admin dashboard: ${BASE_URL}/dashboard/admin`);
  logger.info('');

  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  // return await resend.emails.send({
  //   from: 'Boss of Clean <alerts@bossofclean.com>',
  //   to: ADMIN_EMAIL,
  //   subject: `ALERT: Stripe Dispute - ${data.cleanerName} ($${amountFormatted})`,
  //   html: generateAdminAlertHtml(data),
  // });

  return true;
}

/**
 * Notify cleaner about a new dispute on their account
 */
export async function sendDisputeCleanerNotification(data: DisputeCleanerNotifyData): Promise<boolean> {
  const amountFormatted = (data.amount / 100).toFixed(2);
  const dueDate = data.evidenceDueBy
    ? new Date(data.evidenceDueBy).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  logger.info('[EMAIL] Dispute Notification - Cleaner');
  logger.info(`   To: ${data.to}`);
  logger.info(`   Subject: Payment Dispute on Your Account - Action Required`);
  logger.info(`   Business: ${data.businessName}`);
  logger.info(`   Dispute ID: ${data.disputeId}`);
  logger.info(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  logger.info(`   Reason: ${data.reason}`);
  logger.info(`   Evidence due by: ${dueDate}`);
  logger.info(`   Dashboard: ${BASE_URL}/dashboard/cleaner/billing`);
  logger.info('');

  // TODO: Replace with actual email provider
  return true;
}

/**
 * Notify cleaner about dispute resolution
 */
export async function sendDisputeResolvedNotification(data: DisputeResolvedData): Promise<boolean> {
  const amountFormatted = (data.amount / 100).toFixed(2);
  const outcomeText = data.outcome === 'won'
    ? 'resolved in your favor'
    : 'resolved against your account';

  logger.info('[EMAIL] Dispute Resolved - Cleaner');
  logger.info(`   To: ${data.to}`);
  logger.info(`   Subject: Dispute ${data.outcome === 'won' ? 'Won' : 'Lost'} - $${amountFormatted}`);
  logger.info(`   Business: ${data.businessName}`);
  logger.info(`   Dispute ID: ${data.disputeId}`);
  logger.info(`   Outcome: ${outcomeText}`);
  logger.info(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  logger.info('');

  // TODO: Replace with actual email provider
  return true;
}
