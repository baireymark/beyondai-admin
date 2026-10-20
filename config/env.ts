import { z } from 'zod';

/**
 * Environment variables, validated once at startup (see instrumentation.ts).
 *
 * - Server variables never reach the browser bundle.
 * - Public variables must start with NEXT_PUBLIC_ and be read with a literal
 *   `process.env.NEXT_PUBLIC_*` expression so Next.js can inline them.
 */
const origin = z.url().refine((value) => new URL(value).origin === value, {
  message: 'Use an origin only: scheme, host, and optional port, with no path or trailing slash',
});

const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(z.array(origin).min(1, 'List at least one origin'));

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url().optional(),
    AUTH_SECRET: z.string().min(32, 'Use at least 32 characters, for example `npx auth secret`'),
    AUTH_URL: z.url().optional(),
    CORS_ALLOWED_ORIGINS: originList,
    TURNSTILE_SECRET_KEY: z.string().min(1),
    CONSENT_NOTICE_VERSION: z
      .string()
      .regex(/^[\w.-]{1,32}$/, 'Use up to 32 letters, digits, dots, dashes, or underscores'),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    EMAIL_SERVER_HOST: z.string().min(1).optional(),
    EMAIL_SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    EMAIL_SERVER_USER: z.string().min(1).optional(),
    EMAIL_SERVER_PASSWORD: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default('BeyondAi Admin <no-reply@beyondai.ph>'),
    CRON_SECRET: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      for (const key of ['AUTH_URL', 'EMAIL_SERVER_HOST'] as const) {
        if (!env[key])
          ctx.addIssue({ code: 'custom', path: [key], message: 'Required in production' });
      }
    }
    if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({
        code: 'custom',
        path: ['UPSTASH_REDIS_REST_TOKEN'],
        message: 'Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither',
      });
    }
    if (Boolean(env.EMAIL_SERVER_USER) !== Boolean(env.EMAIL_SERVER_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_SERVER_PASSWORD'],
        message: 'Set both EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD, or neither',
      });
    }
  });

const publicSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('BeyondAi Admin'),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3001'),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid server environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

/** Server environment for the current process. Server code only. */
export function serverEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid public environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
