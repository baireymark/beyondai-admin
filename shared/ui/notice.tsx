import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const tones = {
  info: 'border-info/30 bg-info/10',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  danger: 'border-danger/30 bg-danger/10',
} as const;

/** A highlighted message block, for example "This enquiry was deleted". */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone], className)}>
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : undefined}>{children}</div> : null}
    </div>
  );
}

/** A live region for form results. Screen readers announce changes to it. */
export function FormStatus({
  state,
}: {
  state: { status: string; message?: string } | { status: 'idle' };
}) {
  const message = 'message' in state ? state.message : '';
  return (
    <p
      role="status"
      className={cn('text-sm', state.status === 'error' ? 'text-danger' : 'text-success')}
    >
      {state.status === 'idle' ? '' : message}
    </p>
  );
}
