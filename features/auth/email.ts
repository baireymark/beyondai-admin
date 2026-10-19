import 'server-only';

import type { EmailConfig } from 'next-auth/providers/email';
import { createTransport } from 'nodemailer';

import type { ServerEnv } from '@/config/env';

/** Sign-in links expire quickly; staff can always request a new one. */
export const SIGN_IN_LINK_MINUTES = 15;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function signInEmail(url: string, appName: string) {
  const subject = `Sign in to ${appName}`;
  const text = `Use this link to sign in to ${appName}:\n\n${url}\n\nThe link expires in ${SIGN_IN_LINK_MINUTES} minutes and works once. If you did not ask for it, ignore this email.\n`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<p>Use the button below to sign in to ${escapeHtml(appName)}.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2a49d6;color:#fff;text-decoration:none">Sign in</a></p>
<p>The link expires in ${SIGN_IN_LINK_MINUTES} minutes and works once. If you did not ask for it, ignore this email.</p>
</body></html>`;
  return { subject, text, html };
}

/**
 * Email sign-in links sent over SMTP (any provider: Google Workspace relay,
 * Resend, SES, Postmark). Without EMAIL_SERVER in development, the link is
 * printed to the terminal instead so local sign-in works offline.
 */
export function emailProvider(env: ServerEnv, appName: string): EmailConfig {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    from: env.EMAIL_FROM,
    maxAge: SIGN_IN_LINK_MINUTES * 60,
    async sendVerificationRequest({ identifier, url, provider }) {
      const message = signInEmail(url, appName);
      if (!env.EMAIL_SERVER) {
        if (env.NODE_ENV === 'production') throw new Error('EMAIL_SERVER is not configured');
        console.warn(`\n[dev] Sign-in link (open it in this browser):\n${url}\n`);
        return;
      }
      const result = await createTransport(env.EMAIL_SERVER).sendMail({
        to: identifier,
        from: provider.from,
        ...message,
      });
      const failed = [...(result.rejected ?? []), ...(result.pending ?? [])];
      if (failed.length > 0) throw new Error('The sign-in email was not accepted');
    },
  };
}
