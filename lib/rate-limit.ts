import "server-only";

interface Bucket {
  count: number;
  windowStartedAt: number;
}

const buckets = new Map<string, Bucket>();

const SWEEP_EVERY_N_CALLS = 500;
const MAX_BUCKET_AGE_MS = 10 * 60 * 1000;
let callsSinceSweep = 0;

function sweepExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= MAX_BUCKET_AGE_MS) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  scope: string;
  limit: number;
  windowMs: number;
  identifier: string;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { scope, limit, windowMs, identifier } = options;
  const key = `${scope}:${identifier}`;
  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_EVERY_N_CALLS) {
    callsSinceSweep = 0;
    sweepExpiredBuckets(now);
  }

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterMs = windowMs - (now - bucket.windowStartedAt);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, limit, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function getClientIdentifier(headers: Pick<Headers, "get">): string {
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const entries = forwardedFor.split(",").map((entry) => entry.trim());
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      return lastEntry;
    }
  }

  return "unknown";
}
