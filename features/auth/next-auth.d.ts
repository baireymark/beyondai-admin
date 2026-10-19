import type { Role } from '@/generated/prisma/enums';

// Staff fields that the database session exposes on session.user. They are
// optional because Auth.js also builds placeholder users for unknown emails.
declare module 'next-auth' {
  interface User {
    role?: Role;
    active?: boolean;
  }
}
