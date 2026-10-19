import type { LeadStatus } from '@/generated/prisma/enums';
import { Badge, type BadgeTone } from '@/shared/ui';
import { statusLabel } from '../options';

const STATUS_TONES: Record<LeadStatus, BadgeTone> = {
  NEW: 'primary',
  CONTACTED: 'info',
  QUALIFIED: 'warning',
  WON: 'success',
  LOST: 'neutral',
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{statusLabel(status)}</Badge>;
}

/** Text plus color, so the state never relies on color alone. */
export function OverdueBadge() {
  return (
    <Badge tone="danger">
      <span aria-hidden="true" className="mr-1">
        !
      </span>
      Overdue
    </Badge>
  );
}
