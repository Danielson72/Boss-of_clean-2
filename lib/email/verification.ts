/**
 * Email Verification Utilities
 *
 * Handles resending verification emails via Supabase Auth.
 * Supabase Auth sends the initial verification email automatically on signup.
 * This module provides the resend functionality and types for the verification flow.
 */

import { createClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN_MS = 60_000 // 60 seconds between resends

export interface ResendResult {
  success: boolean
  error?: string
}

/**
 * Resend the verification email for a given email address.
 * Uses Supabase's built-in resend OTP functionality.
 * The magic link expires after 24 hours (configured in Supabase dashboard).
 */
export async function resendVerificationEmail(email: string): Promise<ResendResult> {
  if (!email) {
    return { success: false, error: 'Email address is required' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    // Supabase returns a rate limit error if resent too quickly
    if (error.message.includes('rate') || error.status === 429) {
      return { success: false, error: 'Please wait before requesting another email' }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Returns whether enough time has passed since the last resend.
 * Uses localStorage to track the last resend timestamp.
 */
export function canResendEmail(email: string): boolean {
  if (typeof window === 'undefined') return false
  const key = `verification_resend_${email}`
  const lastSent = localStorage.getItem(key)
  if (!lastSent) return true
  return Date.now() - parseInt(lastSent, 10) >= RESEND_COOLDOWN_MS
}

/**
 * Records the current timestamp as the last resend time.
 */
export function markEmailResent(email: string): void {
  if (typeof window === 'undefined') return
  const key = `verification_resend_${email}`
  localStorage.setItem(key, Date.now().toString())
}

/**
 * Returns milliseconds remaining until resend is allowed.
 */
export function getResendCooldownRemaining(email: string): number {
  if (typeof window === 'undefined') return 0
  const key = `verification_resend_${email}`
  const lastSent = localStorage.getItem(key)
  if (!lastSent) return 0
  const elapsed = Date.now() - parseInt(lastSent, 10)
  return Math.max(0, RESEND_COOLDOWN_MS - elapsed)
}
