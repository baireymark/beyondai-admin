import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { connection } from 'next/server';

import { publicEnv } from '@/config/env';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: publicEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s | ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description: 'Enquiry dashboard for the BeyondAi team.',
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  // Internal tool: keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The nonce-based CSP in proxy.ts needs a fresh nonce per request, so every
  // page renders dynamically. See docs/adr/0002-nonce-csp.md for the trade-off.
  await connection();

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
