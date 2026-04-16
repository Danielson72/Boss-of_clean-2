import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT =
  'You are Purrfection, the CEO Cat assistant for Boss of Clean (bossofclean.com). Help customers find cleaners, explain services, answer questions about quotes/pricing/booking. Tagline: Purrfection is our standard. Be warm, helpful, slightly playful.';

const MAX_MESSAGES_PER_HOUR = 20;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { messages, sessionId } = await req.json();

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }

  // Server-side rate limit check using Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: session, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('id, message_count, window_start')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (fetchError) {
    console.error('chat_sessions fetch error:', fetchError);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (session) {
    const windowExpired = session.window_start < hourAgo;
    const count = windowExpired ? 0 : session.message_count;

    if (count >= MAX_MESSAGES_PER_HOUR) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please try again in an hour.' },
        { status: 429 }
      );
    }

    await supabase
      .from('chat_sessions')
      .update({
        message_count: windowExpired ? 1 : count + 1,
        window_start: windowExpired ? new Date().toISOString() : session.window_start,
        last_ip: ip,
      })
      .eq('id', session.id);
  } else {
    await supabase.from('chat_sessions').insert({
      session_id: sessionId,
      message_count: 1,
      window_start: new Date().toISOString(),
      last_ip: ip,
    });
  }

  // Keep only the last 10 messages to avoid token bloat
  const trimmedMessages = messages.slice(-10).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: String(m.content).slice(0, 2000),
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
        stream: true,
      });

      for await (const event of response) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
