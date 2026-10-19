import type { Metadata } from 'next';

import { requireAdmin } from '@/features/auth/server';
import { AddUserForm, UserTable } from '@/features/users';
import { listUsers } from '@/features/users/server';
import { Card } from '@/shared/ui';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <main id="main" className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Only people listed here can sign in. Deactivating an account signs it out immediately.
        </p>
      </div>
      <Card>
        <h2 className="text-lg font-semibold">Give someone access</h2>
        <div className="mt-4">
          <AddUserForm />
        </div>
      </Card>
      <UserTable users={users} currentUserId={admin.id} />
    </main>
  );
}
