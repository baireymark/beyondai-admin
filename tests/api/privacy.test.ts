import { GET as retentionCron } from '@/app/api/cron/retention/route';
import * as privacyExportRoute from '@/app/api/admin/privacy/export/route';
import { erasePersonData, runRetention } from '@/features/privacy/server';
import { createLead, createUser, db, hoursAgo, signInAs } from './helpers';

const DAY_HOURS = 24;

function exportRequest(email: string): Request {
  const form = new FormData();
  form.set('email', email);
  return new Request('http://localhost:3001/api/admin/privacy/export', {
    method: 'POST',
    headers: { origin: 'http://localhost:3001' },
    body: form,
  });
}

describe('data subject requests', () => {
  it('exports every enquiry for an email, including deleted ones, and logs only a count', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    signInAs(admin);
    const lead = await createLead({ workEmail: 'Maria@Example.com' });
    await createLead({ workEmail: 'maria@example.com', deletedAt: new Date() });
    await createLead({ workEmail: 'someone@else.example' });
    await db.leadNote.create({ data: { leadId: lead.id, authorId: admin.id, body: 'Called.' } });

    const response = await privacyExportRoute.POST(exportRequest('maria@example.com'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="data-export-/,
    );
    const body = (await response.json()) as { leadCount: number; leads: { notes: unknown[] }[] };
    expect(body.leadCount).toBe(2);
    expect(body.leads.flatMap((item) => item.notes)).toHaveLength(1);

    const log = await db.privacyLog.findMany();
    expect(log).toMatchObject([{ action: 'EXPORT', recordCount: 2, actorId: admin.id }]);
    expect(JSON.stringify(log)).not.toContain('maria');
  });

  it('erases a person permanently with notes and activity', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const lead = await createLead({ workEmail: 'maria@example.com' });
    await db.leadNote.create({ data: { leadId: lead.id, authorId: admin.id, body: 'Called.' } });
    await db.leadActivity.create({ data: { leadId: lead.id, action: 'created' } });
    const keep = await createLead({ workEmail: 'other@example.com' });

    await expect(erasePersonData('MARIA@example.com', admin)).resolves.toEqual({ deleted: 1 });
    expect(await db.lead.findUnique({ where: { id: lead.id } })).toBeNull();
    expect(await db.leadNote.count()).toBe(0);
    expect(await db.leadActivity.count({ where: { leadId: lead.id } })).toBe(0);
    expect(await db.lead.findUnique({ where: { id: keep.id } })).not.toBeNull();
    expect(await db.privacyLog.findFirst()).toMatchObject({ action: 'ERASURE', recordCount: 1 });
  });
});

describe('retention', () => {
  it('removes leads past their retention period and keeps the rest', async () => {
    const oldDeleted = await createLead({ deletedAt: hoursAgo(31 * DAY_HOURS) });
    const recentDeleted = await createLead({ deletedAt: hoursAgo(5 * DAY_HOURS) });
    const oldWon = await createLead({ status: 'WON', updatedAt: hoursAgo(800 * DAY_HOURS) });
    const oldOpen = await createLead({ status: 'QUALIFIED', updatedAt: hoursAgo(800 * DAY_HOURS) });

    await expect(runRetention()).resolves.toEqual({ softDeleted: 1, closed: 1 });
    const remaining = (await db.lead.findMany({ select: { id: true } }))
      .map((lead) => lead.id)
      .sort();
    expect(remaining).toEqual([recentDeleted.id, oldOpen.id].sort());
    expect(remaining).not.toContain(oldDeleted.id);
    expect(remaining).not.toContain(oldWon.id);
    expect(await db.privacyLog.findFirst()).toMatchObject({
      action: 'RETENTION_PURGE',
      recordCount: 2,
    });
  });

  it('runs from the cron route only with the right bearer token', async () => {
    const call = (authorization?: string) =>
      retentionCron(
        new Request('http://localhost:3001/api/cron/retention', {
          headers: authorization ? { authorization } : {},
        }),
      );

    expect((await call('Bearer anything')).status).toBe(404);

    vi.stubEnv('CRON_SECRET', 'cron-secret-for-tests');
    try {
      expect((await call()).status).toBe(401);
      expect((await call('Bearer wrong-secret-of-same-len')).status).toBe(401);
      const response = await call('Bearer cron-secret-for-tests');
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, softDeleted: 0, closed: 0 });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
