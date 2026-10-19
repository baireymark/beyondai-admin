import { checkRateLimits, createMemoryRateLimiter, retryAfterSeconds } from './rate-limit';

describe('createMemoryRateLimiter', () => {
  it('allows up to the limit, then blocks until the window resets', async () => {
    let now = 0;
    const limiter = createMemoryRateLimiter({ limit: 2, windowSeconds: 60 }, () => now);

    expect((await limiter.limit('ip')).success).toBe(true);
    expect((await limiter.limit('ip')).success).toBe(true);
    expect(await limiter.limit('ip')).toEqual({ success: false, resetAt: 60_000 });

    now = 60_000;
    expect((await limiter.limit('ip')).success).toBe(true);
  });

  it('counts each key separately', async () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowSeconds: 60 }, () => 0);
    expect((await limiter.limit('a')).success).toBe(true);
    expect((await limiter.limit('b')).success).toBe(true);
    expect((await limiter.limit('a')).success).toBe(false);
  });
});

describe('checkRateLimits', () => {
  it('fails when any limiter is exhausted and reports the latest reset', async () => {
    const short = createMemoryRateLimiter({ limit: 1, windowSeconds: 10 }, () => 0);
    const long = createMemoryRateLimiter({ limit: 1, windowSeconds: 100 }, () => 0);
    expect((await checkRateLimits([short, long], 'ip')).success).toBe(true);
    expect(await checkRateLimits([short, long], 'ip')).toEqual({
      success: false,
      resetAt: 100_000,
    });
  });
});

describe('retryAfterSeconds', () => {
  it('rounds up and never returns less than one second', () => {
    expect(retryAfterSeconds(10_500, 0)).toBe('11');
    expect(retryAfterSeconds(0, 5_000)).toBe('1');
  });
});
