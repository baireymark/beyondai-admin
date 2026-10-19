import type { APIRequestContext } from '@playwright/test';

import { ADMIN_STATE, PUBLIC_ORIGIN, STAFF_STATE } from './accounts';
import { expect, test } from './fixtures';

let submissions = 0;

/**
 * Posts an enquiry as the public site's browser would. Each one comes from its
 * own address, so the per-IP rate limit (5 per 10 minutes) does not trip
 * across browsers. Locally nothing sits in front of the server, so the
 * forwarded address is taken as given.
 */
async function submitEnquiry(request: APIRequestContext, fullName: string) {
  submissions += 1;
  const response = await request.post('/api/leads', {
    data: { ...enquiry, fullName },
    headers: {
      Origin: PUBLIC_ORIGIN,
      'X-Forwarded-For': `198.51.100.${(Date.now() + submissions) % 250}`,
    },
  });
  expect(response.status()).toBe(201);
  return response;
}

const enquiry = {
  fullName: 'Playwright Visitor',
  workEmail: 'visitor@example.com',
  organization: 'E2E Industries',
  topic: 'PRODUCT_DEMO',
  interestAreas: ['ERP'],
  preferredCallTime: '2026-10-22T14:00:00+08:00',
  message: 'We would like a product demo for our finance team.',
  consent: true,
  consentVersion: '2026-10',
  // Cloudflare's test secret accepts any token.
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
  sourcePage: '/contact',
};

test.describe('enquiry lifecycle', () => {
  test.use({ storageState: STAFF_STATE });

  test('a public submission appears in the dashboard and staff can work it', async ({
    page,
    request,
    checkA11y,
    cspViolations,
  }) => {
    const name = `Visitor ${test.info().project.name}`;
    const created = await submitEnquiry(request, name);
    expect(created.headers()['access-control-allow-origin']).toBe(PUBLIC_ORIGIN);

    await page.goto('/leads');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enquiries');
    await checkA11y();
    await page.getByRole('link', { name }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(
      page.getByText('We would like a product demo for our finance team.'),
    ).toBeVisible();
    await checkA11y();

    await page.getByLabel('Status').selectOption('CONTACTED');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();

    await page.getByLabel('Add a note').fill('Called and booked a demo for Thursday.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Called and booked a demo for Thursday.')).toBeVisible();

    const activity = page.getByRole('heading', { name: 'Activity' }).locator('..');
    await expect(activity.getByText('changed status from New to Contacted')).toBeVisible();
    await expect(activity.getByText('added a note')).toBeVisible();
    await expect(activity.getByText('enquiry received from the website')).toBeVisible();

    expect(cspViolations).toEqual([]);
  });

  test('marking an enquiry Won asks for a reason', async ({ page, request }) => {
    const name = `Closer ${test.info().project.name}`;
    await submitEnquiry(request, name);
    await page.goto(`/leads?q=${encodeURIComponent(name)}`);
    await page.getByRole('link', { name }).click();
    // The list page has a "Status" filter too; wait until the detail page is shown.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);

    await page.getByLabel('Status').selectOption('WON');
    await page.getByLabel('Reason for marking Won').fill('Signed the proposal.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
    await expect(page.getByText('Signed the proposal.').first()).toBeVisible();
  });

  test('staff do not see admin actions', async ({ page }) => {
    await page.goto('/leads');
    await page.locator('tbody a').first().click();
    await expect(page.getByRole('button', { name: 'Delete enquiry' })).toHaveCount(0);

    // The page streams inside the dashboard's loading boundary, so the status
    // is already 200 when the role check fails. What matters is the content.
    await page.goto('/settings/users');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await expect(page.getByText('e2e-admin@beyondai.test')).toHaveCount(0);
  });

  test('the overview loads with counts', async ({ page, checkA11y, cspViolations }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview');
    await expect(page.getByText('Enquiries by topic, last 30 days')).toBeVisible();
    await checkA11y();
    expect(cspViolations).toEqual([]);
  });
});

test.describe('admin', () => {
  test.use({ storageState: ADMIN_STATE });

  test('can delete and restore an enquiry', async ({ page, request }) => {
    const name = `Deletable ${test.info().project.name}`;
    await submitEnquiry(request, name);
    await page.goto(`/leads?q=${encodeURIComponent(name)}`);
    await page.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);

    await page.getByRole('button', { name: 'Delete enquiry' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('This enquiry is deleted')).toBeVisible();

    await page.getByRole('button', { name: 'Restore enquiry' }).click();
    await expect(page.getByText('This enquiry is deleted')).toHaveCount(0);
  });

  test('can give a new person access', async ({ page, checkA11y }) => {
    const email = `new-${test.info().project.name}@beyondai.test`;
    await page.goto('/settings/users');
    await checkA11y();
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Name').fill('New Person');
    await page.getByRole('button', { name: 'Give access' }).click();
    await expect(page.getByRole('cell', { name: new RegExp(email) })).toBeVisible();
  });

  test('downloads a CSV export with the expected columns', async ({ page }) => {
    await page.goto('/leads');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^enquiries-\d{4}-\d{2}-\d{2}\.csv$/);
    const stream = await download.createReadStream();
    let text = '';
    for await (const chunk of stream) text += String(chunk);
    expect(text.replace(/^﻿/, '').split('\r\n')[0]).toContain('id,created_at,full_name,work_email');
  });

  test('the privacy page passes accessibility checks', async ({ page, checkA11y }) => {
    await page.goto('/settings/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
    await checkA11y();
  });
});
