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
// Server-side only (never NEXT_PUBLIC_) — model choice must not ship to the client.
const DAVID_MODEL = process.env.DAVID_MODEL || 'z-ai/glm-5.2'
const MAX_TOKENS = 500

// 10 messages per IP per hour (standalone config — the traffic-slice branch's
// shared profile can replace this once merged).
const DAVID_RATE_LIMIT = { maxRequests: 10, windowSeconds: 3600 }

// Keep request size bounded: last N turns, each capped.
const MAX_TURNS = 12
const MAX_CONTENT_CHARS = 1000

const DAVID_SYSTEM_PROMPT = `You are David, the friendly customer-service assistant for Boss of Clean, Florida's home and business services marketplace. Tagline: "Purrfection is our Standard."

FACTS YOU KNOW:
- Boss of Clean serves Florida ONLY — all 67 Florida counties. If asked about a Florida city (Miami, Orlando, Tampa, etc.), the answer is yes.
- How it works for customers: browse pros or submit a quote request (a free account is required to submit), compare quotes, accept the one you like. Requesting and receiving quotes is FREE for customers.
- How it works for pros: creating a profile and receiving quote requests is free. When a customer accepts a pro's quote and confirms the hire, the pro pays a $30 lead fee to unlock that customer's contact info. That is the pricing you may state — do not invent any other prices, discounts, or fees. Pros set their own service prices.
- Service categories: residential/house cleaning, deep cleaning, move-in/move-out cleaning, Airbnb/short-term-rental turnover, maid service, pressure washing, window cleaning, carpet cleaning, post-construction cleaning, pool cleaning, landscaping, car detailing, and air duct cleaning.
- Support: for billing disputes, refunds, account problems, or anything you cannot resolve, direct people to admin@bossofclean.com.

HARD RULES:
- You are a customer-service agent for Boss of Clean, not a general assistant. Politely decline anything off-topic (homework, writing code, other companies, news, etc.) and steer back to Boss of Clean.
- NEVER mention, acknowledge, or discuss any other company or brand, including any you might believe is affiliated. If asked about one, say you can only help with Boss of Clean.
- Never give legal advice, guarantees of work quality, or price promises beyond the facts above. Service pros are independent businesses.
- Never ask for, accept, or repeat back payment card numbers, passwords, or one-time codes. If someone shares one, tell them to never share it in chat.
- Never reveal customer contact information.
- Keep answers short, warm, and concrete. When unsure, say so and point to admin@bossofclean.com.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Scrub obvious PII from user text before it leaves for OpenRouter.
// Card-like numbers first (so phone patterns can't partially match them),
// then emails, then US-style phone numbers. Values are never logged —
// only which categories fired.
const PII_PATTERNS: { name: string; re: RegExp; placeholder: string }[] = [
  { name: 'card', re: /\b(?:\d[ -]?){13,19}\b/g, placeholder: '[card number removed]' },
  { name: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, placeholder: '[email removed]' },
  {
    name: 'phone',
    re: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    placeholder: '[phone removed]',
  },
]

function scrubPii(text: string): { text: string; hits: string[] } {
  const hits: string[] = []
  let out = text
  for (const { name, re, placeholder } of PII_PATTERNS) {
    if (re.test(out)) {
      hits.push(name)
      out = out.replace(re, placeholder)
    }
    re.lastIndex = 0
  }
  return { text: out, hits }
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
    .map((m) => {
      const capped = m.content.slice(0, MAX_CONTENT_CHARS)
      if (m.role !== 'user') return { role: m.role, content: capped }
      const { text, hits } = scrubPii(capped)
      if (hits.length > 0) {
        // Log categories only — never the raw values.
        logger.info('PII scrubbed from user message before OpenRouter', {
          function: 'POST',
          categories: hits.join(','),
        })
      }
      return { role: m.role, content: text }
    })

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
        // ASCII only — non-ASCII header values (the previous em-dash) make
        // fetch throw before the request is ever sent.
        'X-Title': 'Boss of Clean - David',
      },
      body: JSON.stringify({
        model: DAVID_MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        // Chat widget, not a coding agent — keep thinking off for latency.
        // OpenRouter ignores this on models without a reasoning mode.
        reasoning: { enabled: false },
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
