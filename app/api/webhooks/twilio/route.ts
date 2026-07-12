import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { recordOptOut, removeOptOut } from '@/lib/sms/consent';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/webhooks/twilio/route' });

// Standard SMS keywords. If Twilio Advanced Opt-Out is enabled it handles these
// at the carrier level and blocks sends itself; this webhook is the backstop
// that also persists the choice to our own ledger (sms_opt_outs).
const STOP_KEYWORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']);
const START_KEYWORDS = new Set(['start', 'unstop', 'yes']);

function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * Inbound SMS webhook. Handles STOP/START so opt-outs are honored server-side.
 * Requests are verified against the Twilio signature — fail-closed on any
 * missing config or bad signature.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get('x-twilio-signature');
  // Twilio signs against the exact public URL it POSTed to. Behind a proxy the
  // inferred URL can differ, so allow an explicit override.
  const url = process.env.TWILIO_WEBHOOK_URL || req.nextUrl.href;

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = typeof value === 'string' ? value : '';
  });

  if (!authToken || !signature || !twilio.validateRequest(authToken, signature, url, params)) {
    logger.warn('Rejected Twilio webhook: missing/invalid signature', { function: 'POST' });
    return new NextResponse('Forbidden', { status: 403 });
  }

  const from = (params.From || '').trim();
  const bodyText = (params.Body || '').trim().toLowerCase();
  if (!from) return twiml();

  if (STOP_KEYWORDS.has(bodyText)) {
    await recordOptOut(from, 'sms_stop');
    logger.info('Recorded SMS opt-out', { function: 'POST' });
    return twiml('You are unsubscribed from Boss of Clean texts and will not receive more. Reply START to resubscribe.');
  }

  if (START_KEYWORDS.has(bodyText)) {
    await removeOptOut(from);
    logger.info('Removed SMS opt-out', { function: 'POST' });
    return twiml('You are resubscribed to Boss of Clean texts. Reply STOP to opt out.');
  }

  return twiml();
}
