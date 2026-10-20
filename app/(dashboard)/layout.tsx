import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { publicEnv } from '@/config/env';
import { SignOutButton } from '@/features/auth';
import { requireUser } from '@/features/auth/server';
import { HeaderCounts } from '@/features/leads';
import { getHeaderCounts } from '@/features/leads/server';
import { Badge, Logo, NavLink, ThemeToggle } from '@/shared/ui';

function Navigation({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0"
    >
      <NavLink href="/" exact>
        Overview
      </NavLink>
      <NavLink href="/leads" match={{ param: 'ownerId', value: null }}>
        Enquiries
      </NavLink>
      <NavLink href="/leads?ownerId=me" match={{ param: 'ownerId', value: 'me' }}>
        My enquiries
      </NavLink>
      {isAdmin ? (
        <>
          <p className="mt-4 hidden px-3 text-xs font-medium tracking-wide text-fg-muted uppercase md:block">
            Admin
          </p>
          <NavLink href="/settings/users">Users</NavLink>
          <NavLink href="/settings/privacy">Privacy</NavLink>
        </>
      ) : null}
    </nav>
  );
}

/**
 * Shell for every signed-in page. The proxy only checks that a session cookie
 * exists; requireUser() validates the session against the database.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const counts = await getHeaderCounts();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="border-b border-border bg-surface md:min-h-dvh md:border-r md:border-b-0">
        <div className="px-6 py-4">
          <Link
            href="/"
            aria-label={publicEnv.NEXT_PUBLIC_APP_NAME}
            className="inline-flex rounded-lg"
          >
            <Logo label="Admin" markClassName="size-10" />
          </Link>
        </div>
        <Suspense fallback={null}>
          <Navigation isAdmin={isAdmin} />
        </Suspense>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          <HeaderCounts initial={counts} />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{user.name ?? user.email}</span>
            <Badge tone={isAdmin ? 'primary' : 'neutral'}>{isAdmin ? 'Admin' : 'Staff'}</Badge>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
