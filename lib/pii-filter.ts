// Server-side PII filter for chat messages.
// Blocks contact-sharing patterns when a lead is not yet unlocked,
// preventing pros from bypassing the lead unlock fee.

export interface PIIFilterResult {
  blocked: boolean;
  matchedPattern?: string;
  sanitized?: string;
}

// Patterns that would let someone share contact info for free
const PII_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Phone numbers — covers US formats and international
  {
    name: 'phone_number',
    pattern:
      /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,11})/g,
  },
  // Email addresses
  {
    name: 'email_address',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  // Payment apps
  { name: 'zelle', pattern: /\bzelle\b/gi },
  { name: 'venmo', pattern: /\bvenmo\b/gi },
  { name: 'cashapp', pattern: /\bcash\s*app\b|\bcashapp\b/gi },
  { name: 'paypal', pattern: /\bpaypal\b/gi },
  // WhatsApp
  { name: 'whatsapp', pattern: /\bwhatsapp\b|\bwhats\s*app\b/gi },
  // Direct contact solicitation phrases
  {
    name: 'contact_solicitation',
    pattern:
      /\b(call\s+me\s+at|text\s+me\s+at|my\s+number\s+is|reach\s+me\s+at|contact\s+me\s+at|message\s+me\s+at|find\s+me\s+at)\b/gi,
  },
  // "at" + phone-like sequences following contact words
  {
    name: 'social_handle_number',
    pattern: /\b(signal|telegram)\b/gi,
  },
]

/**
 * Returns true if the message content contains PII patterns that should be
 * blocked for unlocked leads, along with which pattern matched first.
 */
export function filterPII(content: string, isUnlocked: boolean): PIIFilterResult {
  // PII filter is completely OFF once the lead is paid/unlocked
  if (isUnlocked) {
    return { blocked: false }
  }

  for (const { name, pattern } of PII_PATTERNS) {
    // Reset stateful regex
    pattern.lastIndex = 0
    if (pattern.test(content)) {
      pattern.lastIndex = 0
      return { blocked: true, matchedPattern: name }
    }
  }

  return { blocked: false }
}
