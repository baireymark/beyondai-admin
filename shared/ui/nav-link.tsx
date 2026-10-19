'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Sidebar link that marks itself as the current page. `match` narrows the
 * match to a query parameter, so "/leads?ownerId=me" and "/leads" are
 * distinct entries.
 */
export function NavLink({
  href,
  children,
  exact = false,
  match,
}: {
  href: Route;
  children: ReactNode;
  exact?: boolean;
  match?: { param: string; value: string | null };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = href.split('?')[0]!;
  const pathMatches = exact
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
  const paramMatches = !match || searchParams.get(match.param) === match.value;
  const current = pathMatches && paramMatches;

  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'block shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition',
        current ? 'bg-primary/10 text-primary' : 'text-fg-muted hover:bg-bg hover:text-fg',
      )}
    >
      {children}
    </Link>
  );
}
