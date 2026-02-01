import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * In-memory rate limiter store.
 * Keys are formatted as `${prefix}:${identifier}`.
 * Each entry tracks a request count and the time when the window resets.
 */
const store = new Map<string, RateLimitEntry>();

/** Interval handle for periodic cleanup (lazy-initialized) */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  // Run cleanup every 60 seconds to evict expired entries
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    });
  }, 60_000);
  // Allow the Node.js process to exit even if the interval is active
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Check rate limit for a given identifier.
 * Returns { allowed, remaining, resetAt } where resetAt is a Unix timestamp (seconds).
 */
function checkLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(key);

  // No entry or window has expired — start a fresh window
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: Math.ceil(resetAt / 1000),
    };
  }

  // Window still active
  entry.count += 1;
  const allowed = entry.count <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: Math.ceil(entry.resetAt / 1000),
  };
}

// ---------------------------------------------------------------------------
// Pre-configured rate limit profiles
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Quote requests: 5 per hour per IP */
  quoteRequest: { maxRequests: 5, windowSeconds: 3600 } as RateLimitConfig,
  /** Review creation: 10 per hour per user */
  reviewCreate: { maxRequests: 10, windowSeconds: 3600 } as RateLimitConfig,
  /** Message sending: 60 per hour per user */
  messageSend: { maxRequests: 60, windowSeconds: 3600 } as RateLimitConfig,
  /** Auth endpoints (login/signup): 10 per 15 minutes per IP */
  auth: { maxRequests: 10, windowSeconds: 900 } as RateLimitConfig,
} as const;

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
    // x-forwarded-for can contain a comma-separated list; take the first
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// ---------------------------------------------------------------------------
// Middleware-level rate limiting (Edge Runtime compatible)
// Used for paths matched in middleware.ts (e.g. auth pages)
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting inside Next.js middleware.
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 */
export function rateLimitMiddleware(
  request: NextRequest,
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const key = `${prefix}:${identifier}`;
  const result = checkLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.ceil(Date.now() / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Route-level rate limiting (for API routes and Server Actions)
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting inside an API route or Server Action.
 * Returns a NextResponse with 429 if limit is exceeded, or null if allowed.
 */
export function rateLimitRoute(
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const key = `${prefix}:${identifier}`;
  const result = checkLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.ceil(Date.now() / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  return null;
}

/**
 * Check rate limit and return a result object (for Server Actions that
 * cannot return NextResponse directly).
 */
export function checkRateLimit(
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const key = `${prefix}:${identifier}`;
  const result = checkLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.ceil(Date.now() / 1000));
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}
