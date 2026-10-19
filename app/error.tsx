'use client';

import { useEffect } from 'react';

import { Button } from '@/shared/ui';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest only: it links to the server log without exposing details.
    console.error('Unhandled UI error', { digest: error.digest });
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-fg-muted">
        Please try again. If it keeps happening, contact support.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
