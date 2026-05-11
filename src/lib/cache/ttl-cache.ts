import { Redis } from '@upstash/redis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const CACHE_PREFIX = 'school-conduct:cache:';

function redisKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

function getMemoryCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value as T;
}

function setMemoryCache<T>(key: string, value: T, ttlMs: number) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getTtlCache<T>(key: string): Promise<T | undefined> {
  const memoryValue = getMemoryCache<T>(key);
  if (memoryValue !== undefined) return memoryValue;
  if (!redis) return undefined;

  try {
    const value = await redis.get<T>(redisKey(key));
    if (value === null || value === undefined) return undefined;
    setMemoryCache(key, value, 30_000);
    return value;
  } catch (error) {
    console.error('[Cache] Redis get failed, falling back to in-memory cache:', error);
    return undefined;
  }
}

export async function setTtlCache<T>(key: string, value: T, ttlMs: number) {
  setMemoryCache(key, value, ttlMs);
  if (!redis) return;

  try {
    await redis.set(redisKey(key), value, { ex: Math.max(1, Math.ceil(ttlMs / 1000)) });
  } catch (error) {
    console.error('[Cache] Redis set failed, keeping in-memory cache only:', error);
  }
}

export async function clearTtlCacheByPrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }

  if (!redis) return;

  try {
    const keys = await redis.keys(`${redisKey(prefix)}*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch (error) {
    console.error('[Cache] Redis prefix clear failed, in-memory cache was cleared:', error);
  }
}
