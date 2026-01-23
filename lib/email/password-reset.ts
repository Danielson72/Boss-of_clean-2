/**
 * Password Reset Utilities
 *
 * Provides rate limiting and password strength validation
 * for the password reset flow. Rate limits reset requests
 * to a maximum of 3 per hour per email address using localStorage.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3
const STORAGE_KEY_PREFIX = 'pwd_reset_'

interface RateLimitEntry {
  timestamps: number[]
}

/**
 * Check if a password reset request is allowed for the given email.
 * Enforces max 3 requests per hour per email.
 */
export function canRequestReset(email: string): { allowed: boolean; remainingSeconds: number } {
  if (typeof window === 'undefined') return { allowed: true, remainingSeconds: 0 }

  const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`
  const now = Date.now()
  const entry = getEntry(key)

  // Filter to only timestamps within the current window
  const recentTimestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  )

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    // Find when the oldest entry in the window expires
    const oldestInWindow = Math.min(...recentTimestamps)
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow)
    const remainingSeconds = Math.ceil(remainingMs / 1000)
    return { allowed: false, remainingSeconds }
  }

  return { allowed: true, remainingSeconds: 0 }
}

/**
 * Record a password reset request for rate limiting purposes.
 */
export function recordResetRequest(email: string): void {
  if (typeof window === 'undefined') return

  const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`
  const now = Date.now()
  const entry = getEntry(key)

  // Keep only timestamps within the window
  const recentTimestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  )
  recentTimestamps.push(now)

  localStorage.setItem(key, JSON.stringify({ timestamps: recentTimestamps }))
}

/**
 * Get the number of remaining reset requests allowed for this email.
 */
export function getRemainingRequests(email: string): number {
  if (typeof window === 'undefined') return MAX_REQUESTS_PER_WINDOW

  const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`
  const now = Date.now()
  const entry = getEntry(key)

  const recentTimestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  )

  return Math.max(0, MAX_REQUESTS_PER_WINDOW - recentTimestamps.length)
}

function getEntry(key: string): RateLimitEntry {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return { timestamps: [] }
    const parsed = JSON.parse(stored)
    if (parsed && Array.isArray(parsed.timestamps)) {
      return parsed
    }
    return { timestamps: [] }
  } catch {
    return { timestamps: [] }
  }
}

// Password strength validation

export interface PasswordStrength {
  score: number // 0-4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
  requirements: PasswordRequirement[]
  isValid: boolean
}

export interface PasswordRequirement {
  label: string
  met: boolean
}

/**
 * Validate password strength against requirements.
 * Password must meet ALL requirements to be valid:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one number', met: /\d/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ]

  const metCount = requirements.filter((r) => r.met).length
  const isValid = requirements.every((r) => r.met)

  let score: number
  let label: PasswordStrength['label']

  if (metCount <= 2) {
    score = 1
    label = 'Weak'
  } else if (metCount <= 3) {
    score = 2
    label = 'Fair'
  } else if (metCount <= 4) {
    score = 3
    label = 'Good'
  } else {
    score = 4
    label = 'Strong'
  }

  if (password.length === 0) {
    score = 0
    label = 'Weak'
  }

  return { score, label, requirements, isValid }
}
