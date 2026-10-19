// @vitest-environment node
import { signInEmail } from './email';

describe('signInEmail', () => {
  it('includes the link and its expiry in both versions', () => {
    const { subject, text, html } = signInEmail(
      'https://admin.beyondai.ph/api/auth/callback/email?token=a&email=b',
      'BeyondAi Admin',
    );
    expect(subject).toBe('Sign in to BeyondAi Admin');
    expect(text).toContain('https://admin.beyondai.ph/api/auth/callback/email?token=a&email=b');
    expect(text).toContain('15 minutes');
    expect(html).toContain(
      'href="https://admin.beyondai.ph/api/auth/callback/email?token=a&#38;email=b"',
    );
  });

  it('escapes HTML in the link', () => {
    const { html } = signInEmail('https://x.example/"><script>alert(1)</script>', 'App');
    expect(html).not.toContain('<script>');
  });
});
