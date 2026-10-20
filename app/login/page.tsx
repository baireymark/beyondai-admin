import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth';
import { getCurrentUser } from '@/features/auth/server';
import { publicEnv } from '@/config/env';
import { Card, Logo, Notice, ThemeToggle } from '@/shared/ui';

export const metadata: Metadata = { title: 'Sign in' };

// Auth.js redirects here with ?error=... when a link is expired or refused.
const ERRORS: Record<string, string> = {
  Verification: 'That sign-in link has expired or was already used. Request a new one.',
};
const GENERIC_ERROR = 'We could not sign you in. Request a new link, or ask an admin for access.';

function safeCallbackUrl(value: string | string[] | undefined): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/';
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getCurrentUser()) redirect('/');
  const params = await searchParams;
  const error = typeof params.error === 'string' ? (ERRORS[params.error] ?? GENERIC_ERROR) : null;

  return (
    <main id="main" className="relative grid min-h-dvh place-items-center px-4 py-12">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-2xl">
            <Logo markClassName="size-11" />
            <span className="sr-only">{publicEnv.NEXT_PUBLIC_APP_NAME}</span>
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            We Don&rsquo;t Follow the Future &mdash; We Design It.
          </p>
        </div>
        <Card>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-fg-muted">
            For invited staff only. Enter your work email and we will send you a link to sign in.
          </p>
          {error ? (
            <Notice tone="danger" className="mt-4">
              {error}
            </Notice>
          ) : null}
          <LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl)} />
        </Card>
      </div>
    </main>
  );
}
