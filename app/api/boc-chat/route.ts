import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { BOC_SYSTEM_PROMPT } from '@/lib/boc-assistant-knowledge'
import { rateLimitRoute, getClientIp } from '@/lib/middleware/rate-limit'

const RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 }
const MAX_HISTORY = 20

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  // Rate limit per IP
  const ip = getClientIp(request)
  const limited = await rateLimitRoute('boc-chat', ip, RATE_LIMIT)
  if (limited) return limited

  let messages: ChatMessage[]
  try {
    const body = await request.json()
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    messages = body.messages.slice(-MAX_HISTORY) as ChatMessage[]
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[BocChat] ANTHROPIC_API_KEY not set')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: BOC_SYSTEM_PROMPT,
      messages,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply: text })
  } catch (err: unknown) {
    console.error('[BocChat] Anthropic error:', (err as Error).message)
    return NextResponse.json({ error: 'Service error, please try again.' }, { status: 500 })
  }
}
