import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  /** Runs axe against the current page with WCAG 2.2 AA rules. */
  checkA11y: () => Promise<void>;
  /** CSP violations reported by the browser during the test. */
  cspViolations: string[];
};

export const test = base.extend<Fixtures>({
  checkA11y: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  },
  cspViolations: async ({ page }, use) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    // A violation the page catches (such as a library probing for eval) never
    // reaches the console, but the browser still fires this event for it.
    await page.exposeFunction('reportCspViolation', (violation: string) => {
      violations.push(violation);
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        const report = (window as unknown as { reportCspViolation: (v: string) => void })
          .reportCspViolation;
        report(`${event.violatedDirective} blocked ${event.blockedURI}`);
      });
    });
    await use(violations);
  },
});

export { expect };
