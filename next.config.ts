import type { NextConfig } from 'next';

/**
 * Static security headers. The Content-Security-Policy is set per request in
 * proxy.ts because it carries a fresh nonce on every response.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Self-contained server build for Docker. Off by default so `npm start`
  // (used by E2E and Lighthouse in CI) keeps working.
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
};

export default nextConfig;
