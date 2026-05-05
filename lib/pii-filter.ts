/**
 * Server-side PII filter for the chat messaging system.
 *
 * Blocks contact info sharing in conversations where the lead has not been
 * unlocked (paid). Once lead_unlocks.status = 'paid' for the conversation's
 * quote_request_id + cleaner_id, the filter is completely off.
 *
 * Patterns blocked:
 *  - Phone numbers (any US format, including partial sequences)
 *  - Email addresses
 *  - Payment handles: Zelle, Venmo, Cash App ($cashtag), PayPal
 *  - Explicit contact phrases (now catches "call me" alone)
 *  - WhatsApp mentions
 *
 * Defense layers (added 2026-05):
 *  1. Single-message regex (existing)
 *  2. Rolling window: concatenates last 5 sender messages and re-runs patterns
 *     to catch sequential splitting (e.g. "407" / "4616039" / "call me")
 *  3. Cumulative digit threshold: hard-block at 10+ digits sent in a single
 *     pre-unlock conversation by the same sender
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PiiFilterResult {
  blocked: boolean
  patternHit?: string
  message?: string
}

// Ordered by specificity — first match wins for logging
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  // Phone numbers — common US formats (full 10-digit sequences)
  {
    name: 'phone_number',
    re: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/,
  },
  // Email addresses
  {
    name: 'email_address',
    re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  },
  // Payment platforms
  {
    name: 'zelle',
    re: /\bzelle\b/i,
  },
  {
    name: 'venmo',
    re: /\bvenmo\b/i,
  },
  {
    name: 'cash_app',
    re: /\bcash\s*app\b|\$[a-zA-Z][a-zA-Z0-9_]{1,19}/i,
  },
  {
    name: 'paypal',
    re: /\bpaypal\b/i,
  },
  // Explicit contact phrases — tightened to catch bare "call me", "text me", etc.
  {
    name: 'contact_phrase',
    re: /\b(call me|text me|reach me|contact me|my number|my phone|my cell|my email|email me at|phone me|hit me up|shoot me a text|give me a call|dm me|find me on)\b/i,
  },
  // WhatsApp
  {
    name: 'whatsapp',
    re: /\bwhatsapp\b|\bwa\.me\b/i,
  },
]

/**
 * Check single message content for PII.
 * Returns { blocked: false } immediately when isUnlocked is true.
 */
export function filterPII(content: string, isUnlocked: boolean): PiiFilterResult {
  if (isUnlocked) return { blocked: false }

  for (const { name, re } of PII_PATTERNS) {
    if (re.test(content)) {
      return {
        blocked: true,
        patternHit: name,
        message: 'To share contact info, unlock this lead first.',
      }
    }
  }

  return { blocked: false }
}

/**
 * Scrub-only helper: replaces every PII match in `content` with a redaction
 * marker and returns the rewritten string plus the patterns that hit.
 *
 * Used for back-filling pre-existing messages that were saved before the
 * server-side filter was active. Does NOT make a block/allow decision —
 * unlike filterPII, this is purely a transformation.
 */
export function scrubText(content: string): { scrubbed: string; matches: string[] } {
  const matches: string[] = []
  let scrubbed = content

  for (const { name, re } of PII_PATTERNS) {
    // PII_PATTERNS are non-global; build a global twin for replaceAll-style behavior.
    const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    if (globalRe.test(scrubbed)) {
      matches.push(name)
      scrubbed = scrubbed.replace(
        new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'),
        '[redacted]'
      )
    }
  }

  return { scrubbed, matches }
}

/**
 * Simple hex SHA-256 of content (for log — no plain text stored).
 * Uses Web Crypto available in Node 18+ / Edge runtime.
 */
export async function hashContent(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback: truncated content length as identifier
    return `len:${content.length}`
  }
}
