import { parseServerEnv } from './config/env';

/**
 * Stops the server at startup when an environment variable is missing or
 * malformed, instead of failing later on the first request that needs it.
 */
export function validateEnvOrExit(): void {
  try {
    parseServerEnv(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
