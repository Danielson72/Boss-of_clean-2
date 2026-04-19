import { NextRequest, NextResponse } from 'next/server'
import { BOC_SYSTEM_PROMPT } from '@/lib/boc-assistant-knowledge'
import { rateLimitRoute, getClientIp, RATE_LIMITS } from '@/lib/middleware/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = await rateLimitRoute('boc-chat', ip, RATE_LIMITS.quoteRequest)
  if (limited) return limited

  try {
    const { messages } = await request.json() as { messages: ChatMessage[] }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const trimmed = messages.slice(-20)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ reply: "I'm temporarily unavailable. Please try again later." })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: BOC_SYSTEM_PROMPT,
        messages: trimmed,
      }),
    })

    if (!res.ok) {
      console.error('[boc-chat] Anthropic error', res.status)
      return NextResponse.json({ reply: "I'm having trouble right now. Please try again in a moment." })
    }

    const data = await res.json()
    const reply = data.content?.[0]?.text ?? "I'm not sure how to answer that. Please contact support@bossofclean.com."

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[boc-chat] error:', err)
    return NextResponse.json({ reply: 'Something went wrong. Please try again.' })
  }
}
