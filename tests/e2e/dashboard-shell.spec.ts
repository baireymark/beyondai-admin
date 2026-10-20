import { ADMIN_STATE } from './accounts';
import { expect, test } from './fixtures';

test.describe('dashboard shell', () => {
  test.use({ storageState: ADMIN_STATE });

  test('the sidebar logo links home, sets "Admin" under the wordmark, and fits the sidebar', async ({
    page,
  }) => {
    await page.goto('/');
    const home = page.getByRole('complementary').getByRole('link', { name: 'BeyondAi Admin' });
    await expect(home).toHaveAttribute('href', '/');

    const wordmark = await home.getByText('BeyondAi', { exact: true }).boundingBox();
    const label = await home.getByText('Admin', { exact: true }).boundingBox();
    expect(wordmark).not.toBeNull();
    expect(label).not.toBeNull();
    expect(label!.y).toBeGreaterThanOrEqual(wordmark!.y + wordmark!.height);
    expect(Math.abs(label!.x - wordmark!.x)).toBeLessThanOrEqual(1);

    // The lockup stays inside the sidebar's padding instead of running to its edge.
    const overflow = await home.evaluate((link) => {
      const parent = link.parentElement!;
      const limit =
        parent.getBoundingClientRect().right - parseFloat(getComputedStyle(parent).paddingRight);
      return link.getBoundingClientRect().right - limit;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
