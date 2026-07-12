import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Phone helpers. We store phone numbers in E.164 (+1XXXXXXXXXX) because the SMS
 * layer (lib/sms/twilio.ts) only sends to E.164 US numbers. Normalize on every
 * write; display in a friendly national format.
 */

/**
 * Normalize a user-entered phone to E.164, assuming US when no country code is
 * given. Returns null if the input is not a valid phone number (caller should
 * reject invalid input).
 */
export function normalizeToE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input.trim(), 'US');
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, e.g. +14075550123
}

/**
 * Format a stored phone for display, e.g. "(407) 555-0123". Falls back to the
 * raw value if it can't be parsed (e.g. a legacy row not yet normalized).
 */
export function formatPhoneForDisplay(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = parsePhoneNumberFromString(value.trim(), 'US');
  return parsed ? parsed.formatNational() : value;
}
