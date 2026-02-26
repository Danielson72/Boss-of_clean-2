/**
 * SMS Notification Service for Boss of Clean
 *
 * High-level notification functions that check user preferences
 * before sending SMS via Twilio.
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger';
import { sendSMS } from './twilio';

const logger = createLogger({ file: 'lib/sms/notifications' });

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Check if a user has SMS enabled for a specific notification type.
 * Returns false if preferences don't exist or SMS is disabled.
 */
async function isSmsEnabled(
  userId: string,
  flag: 'sms_new_leads' | 'sms_new_messages'
): Promise<boolean> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('sms_enabled, sms_new_leads, sms_new_messages')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    const record = data as Record<string, boolean>;
    return record.sms_enabled === true && record[flag] === true;
  } catch (err) {
    logger.error('Failed to check SMS preferences', {
      function: 'isSmsEnabled',
      userId,
      flag,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Non-blocking SMS wrapper. Checks if SMS is configured, then runs the callback.
 * Never throws — logs and swallows all errors so it can safely be used in Promise.allSettled.
 */
export async function sendSMSIfEnabled(
  callback: () => Promise<unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.info('Twilio not configured, skipping SMS', { function: 'sendSMSIfEnabled' });
      return { success: false, error: 'Twilio not configured' };
    }
    await callback();
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown SMS error';
    logger.error('SMS notification failed (non-blocking)', {
      function: 'sendSMSIfEnabled',
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Notify a pro about a new lead in their area.
 */
export async function notifyProNewLead(
  userId: string,
  phoneNumber: string,
  customerName: string,
  serviceType: string,
  zipCode: string
) {
  const enabled = await isSmsEnabled(userId, 'sms_new_leads');
  if (!enabled) {
    logger.info('SMS disabled for new leads, skipping', {
      function: 'notifyProNewLead',
      userId,
    });
    return { success: false, error: 'SMS not enabled' };
  }

  const service = serviceType.replace(/_/g, ' ');
  const body = `Boss of Clean: New ${service} lead in ${zipCode} from ${customerName}. Log in to respond. Reply STOP to unsubscribe`;

  return sendSMS(phoneNumber, body);
}

/**
 * Notify a pro about a new message from a customer.
 */
export async function notifyProNewMessage(
  userId: string,
  phoneNumber: string,
  customerName: string
) {
  const enabled = await isSmsEnabled(userId, 'sms_new_messages');
  if (!enabled) {
    logger.info('SMS disabled for new messages, skipping', {
      function: 'notifyProNewMessage',
      userId,
    });
    return { success: false, error: 'SMS not enabled' };
  }

  const body = `Boss of Clean: New message from ${customerName}. Log in to reply. Reply STOP to unsubscribe`;

  return sendSMS(phoneNumber, body);
}

/**
 * Notify a customer that a pro has sent them a quote.
 */
export async function notifyCustomerQuoteReceived(
  userId: string,
  phoneNumber: string,
  proBusinessName: string,
  serviceType: string
) {
  const enabled = await isSmsEnabled(userId, 'sms_new_messages');
  if (!enabled) {
    logger.info('SMS disabled for quotes, skipping', {
      function: 'notifyCustomerQuoteReceived',
      userId,
    });
    return { success: false, error: 'SMS not enabled' };
  }

  const service = serviceType.replace(/_/g, ' ');
  const body = `Boss of Clean: ${proBusinessName} sent you a ${service} quote! Log in to view. Reply STOP to unsubscribe`;

  return sendSMS(phoneNumber, body);
}

/**
 * Notify a customer that their booking has been confirmed.
 */
export async function notifyCustomerBookingConfirmed(
  userId: string,
  phoneNumber: string,
  proBusinessName: string,
  date: string
) {
  const enabled = await isSmsEnabled(userId, 'sms_new_messages');
  if (!enabled) {
    logger.info('SMS disabled for bookings, skipping', {
      function: 'notifyCustomerBookingConfirmed',
      userId,
    });
    return { success: false, error: 'SMS not enabled' };
  }

  const body = `Boss of Clean: Booking confirmed with ${proBusinessName} on ${date}. Log in for details. Reply STOP to unsubscribe`;

  return sendSMS(phoneNumber, body);
}
