/**
 * Runs once when the server starts. Node-only work lives in a separate file
 * so the Edge bundle never sees Node APIs such as process.exit.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvOrExit } = await import('./instrumentation-node');
    validateEnvOrExit();
  }
}
