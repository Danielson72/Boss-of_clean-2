/**
 * Twilio SMS Client for Boss of Clean
 *
 * Low-level SMS sending via Twilio REST API.
 * All messages are sent from the configured TWILIO_PHONE_NUMBER.
 */

import twilio from 'twilio';
import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/sms/twilio' });

// E.164 US phone number pattern: +1 followed by 10 digits
const E164_US_REGEX = /^\+1[2-9]\d{9}$/;

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  }

  return twilio(accountSid, authToken);
}

/**
 * Validate that a phone number is in E.164 format for US numbers.
 */
export function isValidUSPhone(phone: string): boolean {
  return E164_US_REGEX.test(phone);
}

/**
 * Send an SMS message via Twilio.
 *
 * @param to - Recipient phone number in E.164 format (+1XXXXXXXXXX)
 * @param body - Message body (should be under 160 chars for single segment)
 */
export async function sendSMS(to: string, body: string): Promise<SendSMSResult> {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    logger.error('TWILIO_PHONE_NUMBER not configured');
    return { success: false, error: 'TWILIO_PHONE_NUMBER not configured' };
  }

  if (!isValidUSPhone(to)) {
    logger.warn('Invalid phone number format', { function: 'sendSMS', to });
    return { success: false, error: `Invalid US phone number: ${to}` };
  }

  try {
    const client = getTwilioClient();

    logger.info('Sending SMS', { function: 'sendSMS', to });

    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    });

    logger.info('SMS sent successfully', {
      function: 'sendSMS',
      messageId: message.sid,
      to,
    });

    return { success: true, messageId: message.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to send SMS', {
      function: 'sendSMS',
      to,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}
