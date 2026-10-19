import { parsePublicEnv, parseServerEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://app@localhost:5432/admin',
  AUTH_SECRET: 'x'.repeat(32),
  CORS_ALLOWED_ORIGINS: 'https://beyondai.ph, https://www.beyondai.ph',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  CONSENT_NOTICE_VERSION: '2026-10',
};

describe('parseServerEnv', () => {
  it('parses a valid environment and splits the origin list', () => {
    const env = parseServerEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://beyondai.ph', 'https://www.beyondai.ph']);
  });

  it('names every missing required variable', () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET/);
  });

  it('rejects an origin that carries a path', () => {
    expect(() =>
      parseServerEnv({ ...valid, CORS_ALLOWED_ORIGINS: 'https://beyondai.ph/contact' }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('rejects a short AUTH_SECRET', () => {
    expect(() => parseServerEnv({ ...valid, AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
  });

  it('requires AUTH_URL and EMAIL_SERVER in production', () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: 'production' })).toThrow(
      /AUTH_URL[\s\S]*EMAIL_SERVER/,
    );
  });

  it('requires both Upstash variables or neither', () => {
    expect(() =>
      parseServerEnv({ ...valid, UPSTASH_REDIS_REST_URL: 'https://example.upstash.io' }),
    ).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });
});

describe('parsePublicEnv', () => {
  it('defaults to the local admin URL', () => {
    expect(parsePublicEnv({}).NEXT_PUBLIC_APP_URL).toBe('http://localhost:3001');
  });
});
