/**
 * Email Sending Utility with Notification Preference Checking
 *
 * This module provides a unified interface for sending emails that
 * respects user notification preferences.
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, DEFAULT_FROM } from './resend';

const logger = createLogger({ file: 'lib/email/send-email' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

// Notification type mapping
export type NotificationType = 'booking_updates' | 'messages' | 'promotions' | 'review_requests';

// Email categories that map to notification types
export const EMAIL_CATEGORY_MAP: Record<string, NotificationType> = {
  // Booking related
  booking_confirmation: 'booking_updates',
  booking_cancellation: 'booking_updates',
  booking_reminder: 'booking_updates',
  booking_completed: 'booking_updates',

  // Message related
  new_message: 'messages',
  quote_response: 'messages',
  quote_match: 'messages',

  // Promotional
  promotional: 'promotions',
  newsletter: 'promotions',
  special_offer: 'promotions',

  // Review related
  review_request: 'review_requests',
  review_reminder: 'review_requests',
};

// Emails that should always be sent regardless of preferences
const TRANSACTIONAL_EMAILS = [
  'password_reset',
  'email_verification',
  'account_security',
  'payment_receipt',
  'payment_failed',
  'subscription_cancelled',
  'welcome',
];

interface EmailOptions {
  to: string;
  userId?: string;
  subject: string;
  html: string;
  text?: string;
  category: string;
}

interface NotificationPreferences {
  booking_updates: boolean;
  messages: boolean;
  promotions: boolean;
  review_requests: boolean;
  unsubscribe_token: string;
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('booking_updates, messages, promotions, review_requests, unsubscribe_token')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: userId })
          .select('booking_updates, messages, promotions, review_requests, unsubscribe_token')
          .single();

        if (insertError) {
          logger.error('Failed to create default preferences', { userId }, insertError);
          return null;
        }
        return newPrefs;
      }
      logger.error('Failed to fetch preferences', { userId }, error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error getting user preferences', { userId }, error);
    return null;
  }
}

/**
 * Check if the user wants to receive this type of email
 */
function shouldSendEmail(category: string, preferences: NotificationPreferences | null): boolean {
  // Transactional emails are always sent
  if (TRANSACTIONAL_EMAILS.includes(category)) {
    return true;
  }

  // If we couldn't get preferences, default to sending
  if (!preferences) {
    return true;
  }

  // Get the notification type for this email category
  const notificationType = EMAIL_CATEGORY_MAP[category];

  // If we don't have a mapping for this category, send it
  if (!notificationType) {
    return true;
  }

  // Check if the user has this notification type enabled
  return preferences[notificationType];
}

/**
 * Generate unsubscribe link for an email
 */
export function generateUnsubscribeLink(token: string, type: NotificationType): string {
  return `${BASE_URL}/unsubscribe?token=${token}&type=${type}`;
}

/**
 * Generate unsubscribe footer HTML for emails
 */
export function generateUnsubscribeFooter(token: string, category: string): string {
  const notificationType = EMAIL_CATEGORY_MAP[category];

  if (!notificationType || TRANSACTIONAL_EMAILS.includes(category)) {
    return `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is a transactional email from Boss of Clean.
        </p>
      </div>
    `;
  }

  const unsubscribeUrl = generateUnsubscribeLink(token, notificationType);
  const managePrefsUrl = `${BASE_URL}/dashboard/customer/notifications`;

  return `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
        You received this email because you have ${notificationType.replace(/_/g, ' ')} notifications enabled.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from these emails</a>
        &nbsp;|&nbsp;
        <a href="${managePrefsUrl}" style="color: #6b7280; text-decoration: underline;">Manage notification preferences</a>
      </p>
    </div>
  `;
}

/**
 * Send an email with preference checking
 *
 * @param options - Email options including recipient, subject, and content
 * @returns Promise<{ sent: boolean; reason?: string }>
 */
export async function sendEmail(options: EmailOptions): Promise<{ sent: boolean; reason?: string }> {
  const { to, userId, subject, html, text, category } = options;

  // If userId is provided, check preferences
  if (userId) {
    const preferences = await getUserPreferences(userId);

    if (!shouldSendEmail(category, preferences)) {
      logger.info(`Email not sent - user has ${category} disabled`, {
        function: 'sendEmail',
        userId,
        category,
      });
      return { sent: false, reason: 'User has this notification type disabled' };
    }

    // Add unsubscribe footer to the email
    const unsubscribeFooter = preferences?.unsubscribe_token
      ? generateUnsubscribeFooter(preferences.unsubscribe_token, category)
      : '';

    const htmlWithFooter = html.replace('</body>', `${unsubscribeFooter}</body>`);

    // Send via Resend
    const result = await sendResendEmail({
      to,
      subject,
      html: htmlWithFooter,
      text,
    });

    return { sent: result.success, reason: result.error };
  }

  // No userId - send without preference check (e.g., welcome emails before user exists)
  const result = await sendResendEmail({
    to,
    subject,
    html,
    text,
  });

  return { sent: result.success, reason: result.error };
}

/**
 * Convenience function to send booking update emails
 */
export async function sendBookingEmail(
  userId: string,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; reason?: string }> {
  return sendEmail({
    to,
    userId,
    subject,
    html,
    category: 'booking_confirmation',
  });
}

/**
 * Convenience function to send message notification emails
 */
export async function sendMessageEmail(
  userId: string,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; reason?: string }> {
  return sendEmail({
    to,
    userId,
    subject,
    html,
    category: 'new_message',
  });
}

/**
 * Convenience function to send promotional emails
 */
export async function sendPromotionalEmail(
  userId: string,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; reason?: string }> {
  return sendEmail({
    to,
    userId,
    subject,
    html,
    category: 'promotional',
  });
}

/**
 * Convenience function to send review request emails
 */
export async function sendReviewRequestEmail(
  userId: string,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; reason?: string }> {
  return sendEmail({
    to,
    userId,
    subject,
    html,
    category: 'review_request',
  });
}
