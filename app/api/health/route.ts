import { NextResponse } from 'next/server';

import type { HealthResponse } from '@/shared/api/schemas';

export const dynamic = 'force-dynamic';

/** Uptime check. Never touches lead data. */
export function GET(): NextResponse<HealthResponse> {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
