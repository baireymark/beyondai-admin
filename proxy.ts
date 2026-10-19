import { NextResponse, type NextRequest } from 'next/server';

/**
 * Builds a strict, nonce-based Content Security Policy.
 * 'unsafe-eval' is added only in development, where React needs it for
 * debugging information. Production never allows eval or inline scripts.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' ${isDev ? `'unsafe-inline'` : `'nonce-${nonce}'`}`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? ' ws:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  return directives.join('; ');
}

// Auth.js uses the __Secure- prefix when the app runs on HTTPS.
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];
const PUBLIC_PAGES = new Set(['/login']);

export function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

/**
 * An optimistic gate: requests without a session cookie never reach the
 * dashboard or the admin API. It does not validate the session. Every page
 * and admin route handler checks the session and role itself
 * (Planning/README.md section 12.2).
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/admin')) {
    return hasSessionCookie(request)
      ? NextResponse.next()
      : NextResponse.json(
          { error: 'unauthorized' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        );
  }

  if (!PUBLIC_PAGES.has(pathname) && !hasSessionCookie(request)) {
    const login = new URL('/login', request.url);
    if (pathname !== '/') login.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages: skip other API routes, static assets, and link prefetches.
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/api/admin/:path*',
  ],
};
