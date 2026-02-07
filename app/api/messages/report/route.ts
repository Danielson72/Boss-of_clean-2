import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/messages/report/route' });

const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate_content',
  'scam',
  'other',
] as const;

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messageId: string; reason: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messageId, reason } = body;

  if (!messageId || !reason) {
    return NextResponse.json({ error: 'Message ID and reason are required' }, { status: 400 });
  }

  if (!REPORT_REASONS.includes(reason as typeof REPORT_REASONS[number])) {
    return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
  }

  // Verify the message exists and the user is a participant in the conversation
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id')
    .eq('id', messageId)
    .single();

  if (msgError || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  // Can't report your own messages
  if (message.sender_id === user.id) {
    return NextResponse.json({ error: 'Cannot report your own messages' }, { status: 400 });
  }

  // Verify user is part of the conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, customer_id, cleaner_id')
    .eq('id', message.conversation_id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Check if user is a participant (as customer or via cleaner record)
  const { data: cleanerRecord } = await supabase
    .from('cleaners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isParticipant =
    conversation.customer_id === user.id ||
    (cleanerRecord && conversation.cleaner_id === cleanerRecord.id);

  if (!isParticipant) {
    return NextResponse.json({ error: 'Not authorized to report this message' }, { status: 403 });
  }

  // Update the message with report info
  const { error: updateError } = await supabase
    .from('messages')
    .update({
      reported_at: new Date().toISOString(),
      report_reason: reason,
      reported_by: user.id,
    })
    .eq('id', messageId);

  if (updateError) {
    logger.error('Error reporting message', { function: 'POST' }, updateError);
    return NextResponse.json({ error: 'Failed to report message' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
