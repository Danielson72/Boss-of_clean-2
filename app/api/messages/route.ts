import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNewMessageEmail } from '@/lib/email/new-message';
import { rateLimitRoute, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { createLogger } from '@/lib/utils/logger';
import { notifyProNewMessage, notifyCustomerQuoteReceived, sendSMSIfEnabled } from '@/lib/sms/notifications';
import { filterPII } from '@/lib/pii-filter';

const logger = createLogger({ file: 'api/messages/route' });

interface CreateMessageBody {
  cleanerId: string;
  content: string;
  conversationId?: string;
}

// GET: List user's conversations with last message preview
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isCustomer = userData?.role === 'customer';

  // Get cleaner ID if user is a cleaner
  let cleanerId: string | null = null;
  if (!isCustomer) {
    const { data: cleanerData } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();
    cleanerId = cleanerData?.id || null;
  }

  // Fetch conversations
  let query = supabase
    .from('conversations')
    .select(`
      id,
      customer_id,
      cleaner_id,
      last_message_at,
      customer_unread_count,
      cleaner_unread_count,
      created_at,
      customer:users!conversations_customer_id_fkey(id, full_name, email),
      cleaner:cleaners!conversations_cleaner_id_fkey(id, business_name, user_id)
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (isCustomer) {
    query = query.eq('customer_id', user.id);
  } else if (cleanerId) {
    query = query.eq('cleaner_id', cleanerId);
  } else {
    return NextResponse.json({ conversations: [] });
  }

  const { data: conversations, error } = await query;

  if (error) {
    logger.error('Error fetching conversations', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  // Get last message for each conversation
  const conversationsWithPreview = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, sender_role, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        lastMessage: lastMessage || null,
        unreadCount: isCustomer ? conv.customer_unread_count : conv.cleaner_unread_count,
      };
    })
  );

  return NextResponse.json({ conversations: conversationsWithPreview });
}

// POST: Create new message (creates conversation if needed)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 60 messages per hour per user
  const messageRateLimited = await rateLimitRoute('message-user', user.id, RATE_LIMITS.messageSend);
  if (messageRateLimited) return messageRateLimited;

  let body: CreateMessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { cleanerId, content, conversationId } = body;

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Get user's role
  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const isCustomer = userData?.role === 'customer';

  let actualConversationId = conversationId;
  let recipientEmail = '';
  let recipientName = '';
  let senderName = userData?.full_name || 'User';

  // If customer sending to cleaner, we need cleanerId
  if (isCustomer && !cleanerId && !conversationId) {
    return NextResponse.json({ error: 'Cleaner ID is required' }, { status: 400 });
  }

  // If no conversationId, find or create conversation
  if (!actualConversationId) {
    if (isCustomer) {
      // Verify cleaner exists
      const { data: cleaner, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id, business_name, business_email, user_id')
        .eq('id', cleanerId)
        .single();

      if (cleanerError || !cleaner) {
        return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
      }

      // Get cleaner's email from users table
      const { data: cleanerUser } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', cleaner.user_id)
        .single();

      recipientEmail = cleaner.business_email || cleanerUser?.email || '';
      recipientName = cleaner.business_name;

      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('cleaner_id', cleanerId)
        .single();

      if (existingConv) {
        actualConversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_id: user.id,
            cleaner_id: cleanerId,
          })
          .select('id')
          .single();

        if (convError) {
          logger.error('Error creating conversation', { function: 'POST' }, convError);
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }

        actualConversationId = newConv.id;
      }
    } else {
      return NextResponse.json({ error: 'Conversation ID is required for cleaner' }, { status: 400 });
    }
  } else {
    // Verify user has access to this conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        customer_id,
        cleaner_id,
        customer:users!conversations_customer_id_fkey(email, full_name),
        cleaner:cleaners!conversations_cleaner_id_fkey(business_name, business_email, user_id)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

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

    // Set recipient info for email
    if (isCustomer) {
      const cleanerData = conv.cleaner as unknown as { business_name: string; business_email: string; user_id: string };
      recipientName = cleanerData.business_name;
      // Get cleaner's email
      const { data: cleanerUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', cleanerData.user_id)
        .single();
      recipientEmail = cleanerData.business_email || cleanerUser?.email || '';
    } else {
      const customerData = conv.customer as unknown as { email: string; full_name: string };
      recipientEmail = customerData.email;
      recipientName = customerData.full_name;
    }
  }

  // PII filter: check if this conversation has a paid lead unlock.
  // If not, block any contact-sharing content to prevent fee bypass.
  const conversationData = await supabase
    .from('conversations')
    .select('customer_id, cleaner_id')
    .eq('id', actualConversationId!)
    .single()

  let isLeadUnlocked = false
  if (conversationData.data) {
    const { data: unlock } = await supabase
      .from('lead_unlocks')
      .select('id')
      .eq('cleaner_id', conversationData.data.cleaner_id)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle()

    isLeadUnlocked = !!unlock
  }

  const piiResult = filterPII(content.trim(), isLeadUnlocked)
  if (piiResult.blocked) {
    // Log the bypass attempt for admin review
    await supabase.from('pii_filter_log').insert({
      conversation_id: actualConversationId,
      sender_id: user.id,
      blocked_content: content.trim().substring(0, 500),
      matched_pattern: piiResult.matchedPattern ?? 'unknown',
    })

    return NextResponse.json(
      {
        error: 'To share contact info, unlock this lead first.',
        blocked: true,
      },
      { status: 422 }
    )
  }

  // Create the message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: actualConversationId,
      sender_id: user.id,
      sender_role: isCustomer ? 'customer' : 'cleaner',
      content: content.trim(),
    })
    .select('id, created_at')
    .single();

  if (msgError) {
    logger.error('Error creating message', { function: 'POST' }, msgError);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Send email + SMS notifications in parallel (non-blocking)
  const notifications: Promise<unknown>[] = [];

  if (recipientEmail) {
    notifications.push(
      sendNewMessageEmail({
        recipientEmail,
        recipientName,
        senderName,
        messagePreview: content.trim().substring(0, 100),
        conversationId: actualConversationId!,
      })
    );
  }

  // SMS notification: look up recipient's phone number
  if (isCustomer && cleanerId) {
    // Customer sent message to cleaner — notify the cleaner via SMS
    const { data: cleanerSms } = await supabase
      .from('cleaners')
      .select('business_phone, user_id')
      .eq('id', cleanerId)
      .single();

    if (cleanerSms?.business_phone && cleanerSms?.user_id) {
      notifications.push(
        sendSMSIfEnabled(() =>
          notifyProNewMessage(cleanerSms.user_id, cleanerSms.business_phone, senderName)
        )
      );
    }
  } else if (!isCustomer && actualConversationId) {
    // Cleaner sent message to customer — notify the customer via SMS
    const { data: conv } = await supabase
      .from('conversations')
      .select('customer_id')
      .eq('id', actualConversationId)
      .single();

    if (conv?.customer_id) {
      const { data: customerUser } = await supabase
        .from('users')
        .select('phone')
        .eq('id', conv.customer_id)
        .single();

      if (customerUser?.phone) {
        notifications.push(
          sendSMSIfEnabled(() =>
            notifyCustomerQuoteReceived(conv.customer_id, customerUser.phone, senderName, 'message')
          )
        );
      }
    }
  }

  // Fire all notifications, never let failures break the response
  Promise.allSettled(notifications).catch((err) =>
    logger.error('Notification batch error', { function: 'POST' }, err)
  );

  return NextResponse.json({
    success: true,
    messageId: message.id,
    conversationId: actualConversationId,
  });
}
