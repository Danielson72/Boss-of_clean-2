import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendNewMessageEmail } from '@/lib/email/new-message';
import { rateLimitRoute, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { createLogger } from '@/lib/utils/logger';
import { notifyProNewMessage, notifyCustomerQuoteReceived, sendSMSIfEnabled } from '@/lib/sms/notifications';
import { filterPII, filterPIIWithWindow } from '@/lib/pii-filter';
import { capturedCustomerIdsForPro, redactCustomerForPro } from '@/lib/lead-pii';

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
      .from('pros')
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
      cleaner:pros!conversations_cleaner_id_fkey(id, business_name, user_id)
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

  // SEC-01 (DLD-555): PII wall. A pro only sees the customer's full name and
  // email after paying the lead fee (a captured lead_acceptance on one of that
  // customer's quotes). Locked conversations get first name only, no email —
  // same exposure as quote_requests_pro_view.
  let unlockedCustomerIds = new Set<string>();
  if (!isCustomer && cleanerId) {
    unlockedCustomerIds = await capturedCustomerIdsForPro(
      supabase,
      cleanerId,
      (conversations || []).map((c) => c.customer_id)
    );
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

      // FK embed may be typed as array; normalize before redacting.
      const customerRaw = conv.customer as unknown;
      const customerObj = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
        | { id: string; full_name: string | null; email: string | null }
        | null;

      return {
        ...conv,
        customer: isCustomer
          ? customerObj
          : redactCustomerForPro(customerObj, unlockedCustomerIds.has(conv.customer_id)),
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
        .from('pros')
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
        cleaner:pros!conversations_cleaner_id_fkey(business_name, business_email, user_id)
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
        .from('pros')
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

  // PII filter — check before inserting
  //
  // Gating rule:
  //   - Customers are NEVER unlocked. Their messages always go through the filter.
  //   - Pros are unlocked ONLY when the conversation has a quote_request_id AND
  //     this pro has a paid lead_unlock for that quote.
  //   - Default is "filtered" — organic direct conversations (quote_request_id IS NULL)
  //     stay filtered for both sides, which closes the lead-bypass channel.
  {
    let isUnlocked = false

    if (!isCustomer && actualConversationId) {
      // Pro path: only an organic-paid lead unlocks the filter for this pro.
      const { data: conv } = await supabase
        .from('conversations')
        .select('quote_request_id, cleaner_id')
        .eq('id', actualConversationId)
        .single()

      if (conv?.quote_request_id) {
        const { data: unlock } = await supabase
          .from('lead_acceptances')
          .select('id')
          .eq('quote_request_id', conv.quote_request_id)
          .eq('cleaner_id', conv.cleaner_id)
          .eq('status', 'captured')
          .limit(1)
          .maybeSingle()

        isUnlocked = !!unlock
      }
      // If quote_request_id is NULL: organic conversation → stays filtered.
    }
    // Customers fall through with isUnlocked = false (no exceptions).

    // A6 (DLD-514): cumulative rolling-window scrubber. filterPII catches PII in
    // this single message; filterPIIWithWindow also catches a phone/email split
    // across the sender's recent messages (e.g. "407" / "461" / "6039"). We only
    // pay for the extra read when the conversation is still locked.
    let piiResult: ReturnType<typeof filterPII> = filterPII(content.trim(), isUnlocked)

    if (!isUnlocked && !piiResult.blocked && actualConversationId) {
      // Pull this sender's recent messages in this conversation (cumulative window).
      const { data: recentRows } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', actualConversationId)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const recentSenderMessages = (recentRows || [])
        .map((r: { content: string | null }) => r.content || '')
        .filter(Boolean)

      piiResult = filterPIIWithWindow(recentSenderMessages, content.trim(), isUnlocked)
    }

    if (piiResult.blocked) {
      // Audit log (service-role to bypass RLS).
      // Failure must NOT block the 422 response, but it MUST be visible in logs.
      try {
        const srClient = createServiceRoleClient()
        const { error: logError } = await srClient.from('pii_filter_log').insert({
          conversation_id: actualConversationId,
          sender_id: user.id,
          blocked_content: content.trim(),
          matched_pattern: piiResult.patternHit!,
        })
        if (logError) {
          console.error('[pii-filter] Failed to write audit log entry:', logError.message)
        }
      } catch (err) {
        console.error('[pii-filter] Audit log insert threw:', err)
      }

      return NextResponse.json(
        { error: piiResult.message ?? 'To share contact info, unlock this lead first.' },
        { status: 422 }
      )
    }
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

  // SMS notification: look up recipient's phone number. Also capture the
  // recipient's user_id so we can write an in-app notification row.
  let recipientUserId: string | null = null;
  if (isCustomer && cleanerId) {
    // Customer sent message to cleaner — notify the cleaner via SMS
    const { data: cleanerSms } = await supabase
      .from('pros')
      .select('business_phone, user_id')
      .eq('id', cleanerId)
      .single();

    if (cleanerSms?.user_id) recipientUserId = cleanerSms.user_id;

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
      recipientUserId = conv.customer_id;
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

  // In-app notification row for the recipient (service-role: writing to another
  // user's notifications row). Fire-and-forget.
  if (recipientUserId) {
    const preview = content.trim().substring(0, 100);
    createServiceRoleClient()
      .from('notifications')
      .insert({
        user_id: recipientUserId,
        type: 'new_message',
        title: 'New message',
        message: `${senderName}: ${preview}`,
        action_url: '/dashboard/messages',
      })
      .then(({ error }) => {
        if (error) logger.error('Failed to create message notification', { function: 'POST' }, error);
      });
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
