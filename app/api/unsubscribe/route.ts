import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/unsubscribe/route' });

// Use service role for public unsubscribe access (no auth required)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

const VALID_NOTIFICATION_TYPES = ['booking_updates', 'messages', 'promotions', 'review_requests'] as const;
type NotificationType = typeof VALID_NOTIFICATION_TYPES[number];

// GET - Get current preferences via unsubscribe token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type') as NotificationType | null;

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('booking_updates, messages, promotions, review_requests')
      .eq('unsubscribe_token', token)
      .single();

    if (error || !data) {
      logger.warn('Invalid unsubscribe token', { function: 'GET', token });
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 404 });
    }

    // If type is specified, return only that preference
    if (type && VALID_NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json({ [type]: data[type] });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Unsubscribe GET error', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update preferences via unsubscribe token (one-click unsubscribe)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type, enabled } = body;

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 });
    }

    if (!type || !VALID_NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // First verify the token exists
    const { data: existing, error: fetchError } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !existing) {
      logger.warn('Invalid unsubscribe token', { function: 'POST', token });
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 404 });
    }

    // Update the specific preference
    const { error: updateError } = await supabase
      .from('notification_preferences')
      .update({ [type]: enabled })
      .eq('unsubscribe_token', token);

    if (updateError) {
      logger.error('Failed to update preference', { function: 'POST' }, updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    logger.info(`User unsubscribed from ${type}`, { function: 'POST' });

    return NextResponse.json({
      success: true,
      message: enabled
        ? `You have been re-subscribed to ${type.replace(/_/g, ' ')} notifications.`
        : `You have been unsubscribed from ${type.replace(/_/g, ' ')} notifications.`,
    });
  } catch (error) {
    logger.error('Unsubscribe POST error', { function: 'POST' }, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
