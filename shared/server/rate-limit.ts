import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { serverEnv } from '@/config/env';
import { logger } from './logger';

export type RateLimitResult = { success: boolean; resetAt: number };

export type RateLimiter = {
  limit: (key: string) => Promise<RateLimitResult>;
};

type LimitOptions = { name: string; limit: number; windowSeconds: number };

/**
 * Fixed-window limiter kept in process memory. Used in development and tests,
 * and as a fallback when Upstash is not configured. On a serverless host each
 * instance keeps its own counts, so production should configure Upstash.
 */
export function createMemoryRateLimiter(
  { limit, windowSeconds }: Omit<LimitOptions, 'name'>,
  now: () => number = Date.now,
): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  const windowMs = windowSeconds * 1000;

  return {
    limit(key) {
      const time = now();
      if (windows.size > 10_000) {
        for (const [entryKey, entry] of windows) {
          if (entry.resetAt <= time) windows.delete(entryKey);
        }
      }
      let entry = windows.get(key);
      if (!entry || entry.resetAt <= time) {
        entry = { count: 0, resetAt: time + windowMs };
        windows.set(key, entry);
      }
      entry.count += 1;
      return Promise.resolve({ success: entry.count <= limit, resetAt: entry.resetAt });
    },
  };
}

function createUpstashRateLimiter(
  { name, limit, windowSeconds }: LimitOptions,
  redis: Redis,
): RateLimiter {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `ratelimit:${name}`,
    analytics: false,
  });
  return {
    async limit(key) {
      const result = await ratelimit.limit(key);
      await result.pending;
      return { success: result.success, resetAt: result.reset };
    },
  };
}

let warnedAboutMemory = false;

/** Upstash when configured, otherwise the in-memory limiter. */
export function createRateLimiter(options: LimitOptions): RateLimiter {
  const env = serverEnv();
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return createUpstashRateLimiter(options, redis);
  }
  if (env.NODE_ENV === 'production' && !warnedAboutMemory) {
    warnedAboutMemory = true;
    logger.warn('rate_limit_memory_fallback', {
      hint: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for limits shared across instances',
    });
  }
  return createMemoryRateLimiter(options);
}

/** Checks every limiter and fails if any of them is exhausted. */
export async function checkRateLimits(
  limiters: readonly RateLimiter[],
  key: string,
): Promise<RateLimitResult> {
  const results = await Promise.all(limiters.map((limiter) => limiter.limit(key)));
  const failed = results.filter((result) => !result.success);
  if (failed.length === 0) return { success: true, resetAt: 0 };
  return { success: false, resetAt: Math.max(...failed.map((result) => result.resetAt)) };
}

export function retryAfterSeconds(resetAt: number, now = Date.now()): string {
  return String(Math.max(1, Math.ceil((resetAt - now) / 1000)));
}
