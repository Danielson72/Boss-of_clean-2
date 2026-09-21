export interface SubmissionGuardResult {
  allowed: boolean;
  silentlyDrop: boolean;
  retryAfter?: number;
}

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Shared public-form gate. A filled honeypot receives a normal-looking success
 * response but no side effects. Human-looking submissions proceed to the
 * persistent server-side limiter supplied by the caller.
 */
export async function guardPublicSubmission(
  honeypot: unknown,
  checkLimit: () => Promise<{ allowed: boolean; retryAfter?: number }>,
): Promise<SubmissionGuardResult> {
  if (isHoneypotFilled(honeypot)) {
    return { allowed: false, silentlyDrop: true };
  }

  const limit = await checkLimit();
  return {
    allowed: limit.allowed,
    silentlyDrop: false,
    retryAfter: limit.retryAfter,
  };
}
