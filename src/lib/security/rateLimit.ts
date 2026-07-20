/**
 * Sliding-window rate limiter.
 *
 * In-memory for the MVP (single-node deployment); the interface is
 * Redis-shaped so a distributed store can replace it without changing
 * call sites. Buckets are keyed by scope + client identity (ip or user id).
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unboundedly.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((bucket, key) => {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  });
}

export interface RateLimitRule {
  /** Max requests per window. */
  limit: number;
  /** Window in milliseconds. */
  windowMs: number;
}

/** Route-class rules per the security requirements. */
export const RATE_RULES = {
  auth: { limit: 10, windowMs: 60_000 }, // sign-in / sign-up attempts
  api: { limit: 120, windowMs: 60_000 }, // general authenticated API
  ai: { limit: 20, windowMs: 60_000 }, // AI synthesis endpoints
  messaging: { limit: 30, windowMs: 60_000 }, // message sends
  outingCreate: { limit: 6, windowMs: 3_600_000 }, // outing creation
  reports: { limit: 10, windowMs: 3_600_000 },
} satisfies Record<string, RateLimitRule>;

export type RateScope = keyof typeof RATE_RULES;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(scope: RateScope, clientKey: string): RateResult {
  const rule = RATE_RULES[scope];
  sweep(Math.max(rule.windowMs, 60_000));
  const key = `${scope}:${clientKey}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);

  if (bucket.timestamps.length >= rule.limit) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + rule.windowMs - now) / 1000),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: rule.limit - bucket.timestamps.length,
    retryAfterSeconds: 0,
  };
}
