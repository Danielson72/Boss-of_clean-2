import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

// ---------------------------------------------------------------------------
// Pre-configured rate limit profiles (60-second rolling windows)
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Quote requests: 10 per minute per IP */
  quoteRequest: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Review creation: 10 per minute per user */
  reviewCreate: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Message sending: 20 per minute per user */
  messageSend: { maxRequests: 20, windowSeconds: 60 } as RateLimitConfig,
  /** Auth endpoints (login/signup): 5 per minute per IP */
  auth: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Password reset: 3 per hour per IP */
  passwordReset: { maxRequests: 3, windowSeconds: 3600 } as RateLimitConfig,
  /** Public contact form: 5 per minute per IP */
  contact: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,
} as const;

// ---------------------------------------------------------------------------
// Supabase RPC call — single atomic DB round-trip
// Service-role client is used only in server routes, actions and Edge middleware.
// ---------------------------------------------------------------------------

interface RpcResult {
  allowed: boolean;
  retryAfter: number;
  requestCount: number;
}

async function checkLimitViaRpc(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<RpcResult> {
  try {
    const { data, error } = await createServiceRoleClient().rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error || !data) {
      // Preserve the existing fail-open policy on RPC failure.
      return { allowed: true, retryAfter: 0, requestCount: 0 };
    }

    return {
      allowed: data.allowed,
      retryAfter: data.retry_after_seconds || 0,
      requestCount: data.request_count || 0,
    };
  } catch {
    // Network error — fail open
    return { allowed: true, retryAfter: 0, requestCount: 0 };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from a Next.js request.
 * Checks x-forwarded-for first (common behind reverse proxies / Netlify),
 * then x-real-ip, then falls back to 'unknown'.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function build429Response(config: RateLimitConfig, retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, retryAfter)),
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Middleware-level rate limiting (Edge Runtime compatible)
// Used for paths matched in middleware.ts (e.g. auth pages)
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting inside Next.js middleware.
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 */
export async function rateLimitMiddleware(
  _request: NextRequest,
  prefix: string,
  identifier: string,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await checkLimitViaRpc(identifier, prefix, config);
  return result.allowed ? null : build429Response(config, result.retryAfter);
}

// ---------------------------------------------------------------------------
// Route-level rate limiting (for API routes and Server Actions)
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting inside an API route.
 * Returns a NextResponse with 429 if limit is exceeded, or null if allowed.
 */
export async function rateLimitRoute(
  prefix: string,
  identifier: string,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await checkLimitViaRpc(identifier, prefix, config);
  return result.allowed ? null : build429Response(config, result.retryAfter);
}

/**
 * Check rate limit and return a result object (for Server Actions that
 * cannot return NextResponse directly).
 */
export async function checkRateLimit(
  prefix: string,
  identifier: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const result = await checkLimitViaRpc(identifier, prefix, config);

  if (!result.allowed) {
    return { allowed: false, retryAfter: result.retryAfter };
  }

  return { allowed: true };
}
