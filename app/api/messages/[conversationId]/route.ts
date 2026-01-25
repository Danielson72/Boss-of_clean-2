import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

// GET: Get messages in conversation (paginated)
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { conversationId } = await context.params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select(`
      id,
      customer_id,
      cleaner_id,
      customer:users!conversations_customer_id_fkey(id, full_name, email),
      cleaner:cleaners!conversations_cleaner_id_fkey(id, business_name, user_id)
    `)
    .eq('id', conversationId)
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Get user's role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isCustomer = userData?.role === 'customer';

  // Check access
  if (isCustomer && conv.customer_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!isCustomer) {
    const { data: cleanerData } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cleanerData || cleanerData.id !== conv.cleaner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  // Get pagination params
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, sender_id, sender_role, content, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (msgError) {
    console.error('Error fetching messages:', msgError);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({
    conversation: conv,
    messages: messages || [],
    isCustomer,
  });
}

// POST: Mark messages as read
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { conversationId } = await context.params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get conversation and verify access
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, customer_id, cleaner_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Get user's role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isCustomer = userData?.role === 'customer';

  // Verify access
  if (isCustomer && conv.customer_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!isCustomer) {
    const { data: cleanerData } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cleanerData || cleanerData.id !== conv.cleaner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  // Determine which role's messages to mark as read
  const otherRole = isCustomer ? 'cleaner' : 'customer';

  // Mark unread messages as read
  const { error: updateError } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('sender_role', otherRole)
    .is('read_at', null);

  if (updateError) {
    console.error('Error marking messages as read:', updateError);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }

  // Reset unread count for this user
  const unreadField = isCustomer ? 'customer_unread_count' : 'cleaner_unread_count';
  const { error: convUpdateError } = await supabase
    .from('conversations')
    .update({ [unreadField]: 0 })
    .eq('id', conversationId);

  if (convUpdateError) {
    console.error('Error resetting unread count:', convUpdateError);
  }

  return NextResponse.json({ success: true });
}
