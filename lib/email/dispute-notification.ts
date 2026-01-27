/**
 * Dispute Notification Email Service
 *
 * Sends email notifications for Stripe charge disputes.
 * Placeholder implementation - replace with actual email provider in production.
 */

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

  console.log('[EMAIL] Dispute Alert - Admin Notification');
  console.log(`   To: ${ADMIN_EMAIL}`);
  console.log(`   Subject: ALERT: Stripe Dispute - ${data.cleanerName} ($${amountFormatted})`);
  console.log(`   Dispute ID: ${data.disputeId}`);
  console.log(`   Cleaner: ${data.cleanerName} (${data.cleanerEmail})`);
  console.log(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  console.log(`   Reason: ${data.reason}`);
  console.log(`   Charge: ${data.chargeId}`);
  console.log(`   Admin dashboard: ${BASE_URL}/dashboard/admin`);
  console.log('');

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

  console.log('[EMAIL] Dispute Notification - Cleaner');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: Payment Dispute on Your Account - Action Required`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Dispute ID: ${data.disputeId}`);
  console.log(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  console.log(`   Reason: ${data.reason}`);
  console.log(`   Evidence due by: ${dueDate}`);
  console.log(`   Dashboard: ${BASE_URL}/dashboard/cleaner/billing`);
  console.log('');

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

  console.log('[EMAIL] Dispute Resolved - Cleaner');
  console.log(`   To: ${data.to}`);
  console.log(`   Subject: Dispute ${data.outcome === 'won' ? 'Won' : 'Lost'} - $${amountFormatted}`);
  console.log(`   Business: ${data.businessName}`);
  console.log(`   Dispute ID: ${data.disputeId}`);
  console.log(`   Outcome: ${outcomeText}`);
  console.log(`   Amount: $${amountFormatted} ${data.currency.toUpperCase()}`);
  console.log('');

  // TODO: Replace with actual email provider
  return true;
}
