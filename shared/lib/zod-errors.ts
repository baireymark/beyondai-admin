import type { z } from 'zod';

/**
 * Collapses Zod issues to one message per field, the shape every endpoint
 * returns: { "workEmail": "Enter a valid email address" }. Nested paths are
 * joined with dots, and unknown keys are reported by name.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) fields[[...issue.path, key].join('.')] ??= 'Unknown field';
      continue;
    }
    fields[issue.path.join('.') || '_form'] ??= issue.message;
  }
  return fields;
}
