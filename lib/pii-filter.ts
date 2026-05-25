/**
 * Server-side PII filter for the chat messaging system.
 *
 * Blocks contact info sharing in conversations where the lead has not been
 * unlocked (paid). Once lead_acceptances.status = 'captured' for the conversation's
 * quote_request_id + cleaner_id, the filter is completely off.
 *
 * Patterns blocked:
 *  - Phone numbers (any US format)
 *  - Email addresses
 *  - Payment handles: Zelle, Venmo, Cash App ($cashtag), PayPal
 *  - Explicit contact phrases
 *  - WhatsApp mentions
 */

export interface PiiFilterResult {
  blocked: boolean
  patternHit?: string
  message?: string
}

// Ordered by specificity — first match wins for logging
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  // Phone numbers — common US formats
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
  // Explicit contact phrases
  {
    name: 'contact_phrase',
    re: /\b(call me at|text me at|my number is|reach me at|contact me at|my phone is|my cell is)\b/i,
  },
  // WhatsApp
  {
    name: 'whatsapp',
    re: /\bwhatsapp\b|\bwa\.me\b/i,
  },
]

/**
 * Check message content for PII.
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

/**
 * Rolling-window (cumulative) PII scrubber — DLD-514 / A6.
 *
 * filterPII() catches PII inside a SINGLE message. But a determined sender can
 * split a phone number across several messages, each individually under any
 * threshold: "my number" / "is 407" / "461" / "6039". filterPIIWithWindow()
 * closes that gap by concatenating the sender's recent messages in this
 * conversation with the new one and re-checking the combined text — including
 * a cumulative digit count that catches an assembled phone number.
 *
 * It also normalizes spelled-out digits ("four zero seven") and strips spacing
 * tricks before counting, so "4 0 7 4 6 1 6 0 3 9" and "four oh seven..." are
 * caught the same as "4074616039".
 *
 * Returns blocked:false immediately when isUnlocked is true.
 */

// Map spelled-out digits to numerals so "four zero seven" counts as digits.
const WORD_DIGITS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}

function normalizeDigits(text: string): string {
  // Replace spelled-out digit words with numerals.
  const worded = text
    .toLowerCase()
    .replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (m) => WORD_DIGITS[m] ?? m)
  // Return digits only (collapses spaces/dashes/dots between them).
  return worded.replace(/\D/g, '')
}

export interface WindowFilterResult extends PiiFilterResult {
  cumulativeDigits?: number
}

/**
 * @param recentSenderMessages text of the sender's last few messages in this
 *   conversation (most-recent-first or any order — concatenation is order-free).
 *   The caller pulls these (e.g. last 5 from the same sender in the same convo).
 * @param newContent the message the sender is trying to send now.
 * @param isUnlocked when true, the filter is off (paid lead).
 */
export function filterPIIWithWindow(
  recentSenderMessages: string[],
  newContent: string,
  isUnlocked: boolean
): WindowFilterResult {
  if (isUnlocked) return { blocked: false }

  // First, the new message alone must still pass the single-message filter.
  const single = filterPII(newContent, isUnlocked)
  if (single.blocked) return single

  // Cumulative check: concatenate recent + new, then look for an assembled
  // phone number that no single message revealed.
  const combined = [...recentSenderMessages, newContent].join(' ')

  // Re-run the standard patterns on the combined text (catches an email or
  // phone formed only when fragments are joined). Only meaningful when the NEW
  // message contributes to forming it — a clean new message must never be
  // blocked because of dirty history.
  const newHasDigits = normalizeDigits(newContent).length > 0
  if (newHasDigits) {
    const combinedHit = filterPII(combined, false)
    if (combinedHit.blocked) {
      return { ...combinedHit, patternHit: `windowed_${combinedHit.patternHit}` }
    }

    // Cumulative digit count — catches a 10-digit phone assembled across messages,
    // including spelled-out and space-separated digits. Guarded by newHasDigits so
    // a zero-digit message ("okay", "yes", "sounds good") is never blocked by the
    // window, no matter what the conversation history contains.
    const digitCount = normalizeDigits(combined).length
    if (digitCount >= 10) {
      return {
        blocked: true,
        patternHit: 'windowed_phone_digits',
        message: 'To share contact info, unlock this lead first.',
        cumulativeDigits: digitCount,
      }
    }
  }

  return { blocked: false }
}
