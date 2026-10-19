/**
 * Outcome of a domain operation. Route handlers map failures to HTTP
 * statuses and Server Actions map them to form state, so the rules live in
 * one place and neither caller needs to catch exceptions for expected cases.
 */
export type Failure<E extends string = string> = {
  ok: false;
  error: E;
  fields?: Record<string, string>;
};

export type Result<T, E extends string = string> = { ok: true; value: T } | Failure<E>;

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function fail<E extends string>(error: E, fields?: Record<string, string>): Failure<E> {
  return fields ? { ok: false, error, fields } : { ok: false, error };
}
