import { formatManila } from '@/shared/lib/manila-time';
import { Badge } from '@/shared/ui';
import type { StaffAccount } from '../server/users';
import { UserActions } from './user-actions';

export function UserTable({
  users,
  currentUserId,
}: {
  users: StaffAccount[];
  currentUserId: string;
}) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <caption className="sr-only">Staff accounts</caption>
        <thead className="border-b border-border bg-bg text-xs text-fg-muted uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Role
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Last sign-in
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => {
            const label = user.name ?? user.email;
            return (
              <tr key={user.id} className={user.active ? undefined : 'text-fg-muted'}>
                <td className="px-3 py-2">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-fg-muted">{user.email}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Staff'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {user.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  {user.lastSignInAt ? formatManila(user.lastSignInAt) : 'Never'}
                </td>
                <td className="px-3 py-2">
                  {user.id === currentUserId ? (
                    <span className="text-xs text-fg-muted">This is you</span>
                  ) : (
                    <UserActions
                      userId={user.id}
                      label={label}
                      role={user.role}
                      active={user.active}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
