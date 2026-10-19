import { expect, test } from './fixtures';

test.describe('signed out', () => {
  test('the login page renders, passes accessibility checks, and has no CSP violations', async ({
    page,
    checkA11y,
    cspViolations,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
    await checkA11y();
    expect(cspViolations).toEqual([]);
  });

  test('gives the same answer for an email without access', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Work email').fill('stranger@example.com');
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'If this email has access, a sign-in link is on its way. It expires in 15 minutes.',
    );
  });

  test('dashboard pages redirect to the login page and keep the destination', async ({ page }) => {
    await page.goto('/leads?status=NEW');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fleads%3Fstatus%3DNEW$/);
  });

  test('the admin API answers 401', async ({ request }) => {
    const response = await request.get('/api/admin/leads');
    expect(response.status()).toBe(401);
  });

  test('sends a strict CSP and security headers', async ({ request }) => {
    const response = await request.get('/login');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("'strict-dynamic'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).not.toContain('unsafe-eval');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('is keyboard navigable from the skip link', async ({ page, browserName }) => {
    // Playwright's Windows WebKit build never moves Tab focus to links. Linux
    // WebKit (CI) and the other browsers do, so they keep this check.
    test.skip(
      browserName === 'webkit' && process.platform === 'win32',
      'WebKit on Windows skips links',
    );
    await page.goto('/login');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });
});
