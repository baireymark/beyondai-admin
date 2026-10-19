import 'server-only';

import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';

import { publicEnv, serverEnv } from '@/config/env';
import { db } from '@/shared/server/db';
import { logger } from '@/shared/server/logger';
import { emailProvider } from './email';

export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const adapter = PrismaAdapter(db);
// Access is invite-only: an admin adds the email first, so sign-in must never
// create a user. The signIn callback below already refuses unknown emails.
adapter.createUser = () => {
  throw new Error('Sign-in is invite-only');
};

function isActiveStaff(user: { role?: unknown; active?: boolean }): boolean {
  return Boolean(user.role) && user.active === true;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = serverEnv();
  return {
    adapter,
    secret: env.AUTH_SECRET,
    // Database sessions: role changes and deactivation take effect on the next request.
    session: { strategy: 'database', maxAge: SESSION_MAX_AGE_SECONDS, updateAge: 60 * 60 },
    providers: [emailProvider(env, publicEnv.NEXT_PUBLIC_APP_NAME)],
    pages: { signIn: '/login', verifyRequest: '/login', error: '/login' },
    callbacks: {
      // Runs both when a link is requested and when it is used. Unknown and
      // inactive emails are refused at both points.
      signIn: ({ user }) => isActiveStaff(user),
      session: ({ session, user }) => ({
        ...session,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
        },
      }),
    },
    events: {
      async signIn({ user }) {
        if (user.id) {
          await db.user.update({ where: { id: user.id }, data: { lastSignInAt: new Date() } });
        }
      },
    },
    logger: {
      error(error) {
        // Auth.js errors carry a stable `type`; class names are minified in
        // production builds. A refused email is expected and is not logged.
        const type = (error as { type?: string }).type ?? error.name;
        if (type === 'AccessDenied') return;
        logger.error('auth_error', { type }, error);
      },
      warn(code) {
        logger.warn('auth_warning', { code });
      },
      debug() {},
    },
  };
});
