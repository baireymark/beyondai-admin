import 'server-only';

/**
 * Structured JSON logger that never writes personal data.
 *
 * Fields whose key names suggest personal or secret content are replaced
 * with "[redacted]", and email addresses or phone numbers that appear inside
 * any other string are masked. Log ids, counts, and status codes instead of
 * request bodies.
 */
type Level = 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'body',
  'cookie',
  'email',
  'fullname',
  'identifier',
  'ip',
  'message',
  'name',
  'organization',
  'password',
  'phone',
  'remoteip',
  'secret',
  'token',
  'turnstiletoken',
  'url',
  'workemail',
]);

const EMAIL_PATTERN = /[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /(\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,4}/g;
const MAX_DEPTH = 5;

function scrubString(value: string): string {
  return value.replace(EMAIL_PATTERN, '[email]').replace(PHONE_PATTERN, '[phone]');
}

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(item, depth + 1);
  }
  return result;
}

function serializeError(error: Error): Record<string, unknown> {
  return {
    errorName: error.name,
    errorMessage: scrubString(error.message),
    stack: error.stack ? scrubString(error.stack.split('\n').slice(0, 6).join('\n')) : undefined,
  };
}

function write(level: Level, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(fields) as LogFields),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console -- the logger is the one place that writes info lines
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write('info', event, fields),
  warn: (event: string, fields?: LogFields) => write('warn', event, fields),
  error: (event: string, fields?: LogFields, error?: unknown) =>
    write('error', event, error === undefined ? fields : { ...fields, error }),
};
