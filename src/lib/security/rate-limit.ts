import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const buckets = new Map<string, number[]>();
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const limiters = new Map<string, Ratelimit>();

function windowToDuration(windowMs: number): `${number} s` {
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s`;
}

function getRedisLimiter(limit: number, windowMs: number) {
  if (!redis) return null;
  const limiterKey = `${limit}:${windowMs}`;
  const cached = limiters.get(limiterKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, windowToDuration(windowMs)),
    prefix: 'school-conduct:rate-limit',
    analytics: false,
  });
  limiters.set(limiterKey, limiter);
  return limiter;
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (bucket.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.push(now);
  buckets.set(key, bucket);
  return true;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const limiter = getRedisLimiter(limit, windowMs);
  if (!limiter) return checkMemoryRateLimit(key, limit, windowMs);

  try {
    const result = await limiter.limit(key);
    return result.success;
  } catch (error) {
    console.error('[RateLimit] Redis check failed, falling back to in-memory limiter:', error);
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}

export function resetRateLimitForTests() {
  buckets.clear();
  limiters.clear();
}
