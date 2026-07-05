import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRoute, getClientIp } from '@/lib/middleware/rate-limit'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/david/route' })

export const dynamic = 'force-dynamic'
export const maxDuration = 25

// DLD-559: "David" — Boss of Clean's AI assistant, powered by OpenRouter.
// The key is server-side ONLY (never NEXT_PUBLIC_); the route degrades to a
// 503 when it's absent so the widget can hide/disable itself gracefully.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DAVID_MODEL = 'google/gemini-flash-1.5'
const MAX_TOKENS = 500

// 10 messages per IP per hour (standalone config — the traffic-slice branch's
// shared profile can replace this once merged).
const DAVID_RATE_LIMIT = { maxRequests: 10, windowSeconds: 3600 }

// Keep request size bounded: last N turns, each capped.
const MAX_TURNS = 12
const MAX_CONTENT_CHARS = 1000

const DAVID_SYSTEM_PROMPT =
  "You are David, the friendly assistant for Boss of Clean, Florida's home and business services marketplace. " +
  'Help visitors post quote requests, understand how lead fees work for pros, and navigate the site. ' +
  'Never reveal customer contact information. ' +
  "Never discuss other companies' platforms. " +
  'Keep answers short and warm. Tagline: Purrfection is our Standard.'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  const limited = await rateLimitRoute('david-ip', getClientIp(request), DAVID_RATE_LIMIT)
  if (limited) return limited

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    // Fail loudly server-side; fail gracefully client-side.
    logger.error('OPENROUTER_API_KEY is not set — David is unavailable', { function: 'POST' })
    return NextResponse.json({ error: 'assistant_unavailable' }, { status: 503 })
  }

  let body: { messages?: ChatMessage[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const raw = Array.isArray(body.messages) ? body.messages : []
  const messages = raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_CHARS) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'A user message is required' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bossofclean.com',
        'X-Title': 'Boss of Clean — David',
      },
      body: JSON.stringify({
        model: DAVID_MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages: [{ role: 'system', content: DAVID_SYSTEM_PROMPT }, ...messages],
      }),
    })
  } catch (err) {
    logger.error('OpenRouter request failed', { function: 'POST' }, err)
    return NextResponse.json({ error: 'assistant_unavailable' }, { status: 503 })
  }

  if (!upstream.ok || !upstream.body) {
    logger.error(`OpenRouter returned ${upstream.status}`, { function: 'POST' })
    return NextResponse.json({ error: 'assistant_unavailable' }, { status: 503 })
  }

  // Parse the upstream SSE stream server-side and re-emit plain text deltas —
  // the widget just appends chunks, no SSE parsing in the browser.
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let sseBuffer = ''

  const textStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      sseBuffer += decoder.decode(chunk, { stream: true })
      const lines = sseBuffer.split('\n')
      sseBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[]
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) controller.enqueue(encoder.encode(delta))
        } catch {
          // Partial/keep-alive lines are expected in SSE — skip quietly.
        }
      }
    },
  })

  return new Response(upstream.body.pipeThrough(textStream), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
