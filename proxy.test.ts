// @vitest-environment node
import { NextRequest } from 'next/server';

import { buildContentSecurityPolicy, proxy } from './proxy';

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('buildContentSecurityPolicy', () => {
  it('blocks eval and inline scripts in production', () => {
    const csp = buildContentSecurityPolicy('abc123', false);
    expect(csp).toContain(`script-src 'self' 'nonce-abc123' 'strict-dynamic'`);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain(`frame-ancestors 'none'`);
  });

  it('allows eval only in development', () => {
    expect(buildContentSecurityPolicy('abc123', true)).toContain(`'unsafe-eval'`);
  });
});

describe('proxy', () => {
  it('redirects signed-out page requests to /login and keeps the destination', () => {
    const response = proxy(request('/leads?status=NEW'));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe('/leads?status=NEW');
  });

  it('answers signed-out admin API requests with 401', async () => {
    const response = proxy(request('/api/admin/leads'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('lets the login page through with a CSP', () => {
    const response = proxy(request('/login'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain("'strict-dynamic'");
  });

  it('lets requests with a session cookie through', () => {
    expect(proxy(request('/leads', 'authjs.session-token=abc')).status).toBe(200);
    expect(proxy(request('/api/admin/leads', '__Secure-authjs.session-token=abc')).status).toBe(
      200,
    );
  });
});
