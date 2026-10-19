import * as leadRoute from '@/app/api/admin/leads/[id]/route';
import * as notesRoute from '@/app/api/admin/leads/[id]/notes/route';
import * as restoreRoute from '@/app/api/admin/leads/[id]/restore/route';
import * as exportRoute from '@/app/api/admin/leads/export/route';
import * as listRoute from '@/app/api/admin/leads/route';
import * as overviewRoute from '@/app/api/admin/overview/route';
import { appRequest, createLead, createUser, db, hoursAgo, params, signInAs } from './helpers';

type ListBody = {
  items: { id: string; fullName: string; overdue: boolean }[];
  total: number;
  overdueTotal: number;
  pageCount: number;
};

async function list(query = ''): Promise<ListBody> {
  const response = await listRoute.GET(appRequest(`/api/admin/leads${query}`));
  expect(response.status).toBe(200);
  return (await response.json()) as ListBody;
}

function patch(id: string, body: unknown): Promise<Response> {
  return leadRoute.PATCH(
    appRequest(`/api/admin/leads/${id}`, { method: 'PATCH', body }),
    params({ id }),
  );
}

describe('GET /api/admin/leads', () => {
  beforeEach(async () =>
    signInAs(await createUser({ role: 'ADMIN', email: 'admin@beyondai.test' })),
  );

  it('lists overdue enquiries first, then the chosen order', async () => {
    await createLead({ fullName: 'Fresh', createdAt: hoursAgo(1) });
    await createLead({ fullName: 'Overdue', createdAt: hoursAgo(30) });
    await createLead({
      fullName: 'Old but answered',
      createdAt: hoursAgo(50),
      status: 'CONTACTED',
      firstContactedAt: hoursAgo(49),
    });

    const body = await list();
    expect(body.items.map((item) => item.fullName)).toEqual([
      'Overdue',
      'Fresh',
      'Old but answered',
    ]);
    expect(body.items.map((item) => item.overdue)).toEqual([true, false, false]);
    expect(body.overdueTotal).toBe(1);
  });

  it('pages across the overdue and remaining groups without gaps or repeats', async () => {
    for (let index = 0; index < 3; index += 1) {
      await createLead({ fullName: `Overdue ${index}`, createdAt: hoursAgo(30 + index) });
    }
    for (let index = 0; index < 4; index += 1) {
      await createLead({ fullName: `Fresh ${index}`, createdAt: hoursAgo(index + 1) });
    }
    const pages = [
      await list('?pageSize=2'),
      await list('?pageSize=2&page=2'),
      await list('?pageSize=2&page=3'),
      await list('?pageSize=2&page=4'),
    ];
    const names = pages.flatMap((page) => page.items.map((item) => item.fullName));
    expect(names).toEqual([
      'Overdue 0',
      'Overdue 1',
      'Overdue 2',
      'Fresh 0',
      'Fresh 1',
      'Fresh 2',
      'Fresh 3',
    ]);
    expect(pages[0]!.pageCount).toBe(4);
  });

  it('filters by status, topic, owner, interest, overdue, and date range', async () => {
    const owner = await createUser({ email: 'owner@beyondai.test' });
    await createLead({ fullName: 'A', status: 'WON', topic: 'PARTNERSHIP', ownerId: owner.id });
    await createLead({ fullName: 'B', interestAreas: ['AGENTIC_AI'], createdAt: hoursAgo(30) });
    await createLead({ fullName: 'C', createdAt: new Date('2026-01-15T04:00:00Z') });

    const names = async (query: string) =>
      (await list(query)).items.map((item) => item.fullName).sort();
    expect(await names('?status=WON')).toEqual(['A']);
    expect(await names('?topic=PARTNERSHIP')).toEqual(['A']);
    expect(await names(`?ownerId=${owner.id}`)).toEqual(['A']);
    expect(await names('?ownerId=unassigned')).toEqual(['B', 'C']);
    expect(await names('?interest=AGENTIC_AI')).toEqual(['B']);
    expect(await names('?overdue=true')).toEqual(['B', 'C']);
    expect(await names('?from=2026-01-15&to=2026-01-15')).toEqual(['C']);
  });

  it('shows "my enquiries" for the signed-in user', async () => {
    const me = await createUser({ email: 'me@beyondai.test' });
    signInAs(me);
    await createLead({ fullName: 'Mine', ownerId: me.id });
    await createLead({ fullName: 'Not mine' });
    expect((await list('?ownerId=me')).items.map((item) => item.fullName)).toEqual(['Mine']);
  });

  it('searches name, email, and organization case-insensitively', async () => {
    await createLead({
      fullName: 'Jose Reyes',
      workEmail: 'jose@northwind.example',
      organization: 'Northwind',
    });
    await createLead({
      fullName: 'Ana Cruz',
      workEmail: 'ana@pacific.example',
      organization: 'Pacific Retail',
    });
    expect((await list('?q=REYES')).total).toBe(1);
    expect((await list('?q=pacific.example')).total).toBe(1);
    expect((await list('?q=northWIND')).total).toBe(1);
    // LIKE wildcards in the search are matched literally, not as patterns.
    expect((await list('?q=%25')).total).toBe(0);
    expect((await list('?q=_')).total).toBe(0);
  });

  it('hides deleted enquiries unless an admin asks for them', async () => {
    await createLead({ fullName: 'Deleted', deletedAt: new Date() });
    await createLead({ fullName: 'Active' });
    expect((await list()).items.map((item) => item.fullName)).toEqual(['Active']);
    expect((await list('?deleted=true')).items.map((item) => item.fullName)).toEqual(['Deleted']);

    signInAs(await createUser({ role: 'STAFF' }));
    expect((await list('?deleted=true')).items.map((item) => item.fullName)).toEqual(['Active']);
  });

  it('rejects invalid query parameters', async () => {
    const response = await listRoute.GET(appRequest('/api/admin/leads?status=MAYBE&pageSize=1000'));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(Object.keys(body.fields).sort()).toEqual(['pageSize', 'status']);
  });
});

describe('GET /api/admin/leads/[id]', () => {
  it('returns the lead with notes and activity', async () => {
    const staff = await createUser();
    signInAs(staff);
    const lead = await createLead();
    await notesRoute.POST(
      appRequest(`/api/admin/leads/${lead.id}/notes`, {
        method: 'POST',
        body: { body: 'Called, left a voicemail.' },
      }),
      params({ id: lead.id }),
    );

    const response = await leadRoute.GET(
      appRequest(`/api/admin/leads/${lead.id}`),
      params({ id: lead.id }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      notes: { body: string }[];
      activity: { action: string }[];
    };
    expect(body.notes.map((note) => note.body)).toEqual(['Called, left a voicemail.']);
    expect(body.activity.map((entry) => entry.action)).toEqual(['note_added']);
  });

  it('returns 404 for an unknown id, and for a deleted lead when the viewer is staff', async () => {
    signInAs(await createUser());
    const deleted = await createLead({ deletedAt: new Date() });
    for (const id of ['doesnotexist', deleted.id]) {
      const response = await leadRoute.GET(appRequest(`/api/admin/leads/${id}`), params({ id }));
      expect(response.status).toBe(404);
    }
    signInAs(await createUser({ role: 'ADMIN' }));
    const response = await leadRoute.GET(
      appRequest(`/api/admin/leads/${deleted.id}`),
      params({ id: deleted.id }),
    );
    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/admin/leads/[id]', () => {
  let staff: Awaited<ReturnType<typeof createUser>>;
  beforeEach(async () => {
    staff = await createUser();
    signInAs(staff);
  });

  it('sets firstContactedAt on the first move to Contacted only, and logs each change', async () => {
    const lead = await createLead({ createdAt: hoursAgo(30) });
    expect((await patch(lead.id, { status: 'CONTACTED' })).status).toBe(200);
    const first = await db.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(first.firstContactedAt).not.toBeNull();

    await patch(lead.id, { status: 'QUALIFIED' });
    await patch(lead.id, { status: 'CONTACTED' });
    const later = await db.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(later.firstContactedAt).toEqual(first.firstContactedAt);

    const activity = await db.leadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(activity.map((entry) => [entry.action, entry.detail, entry.actorId])).toEqual([
      ['status_changed', { from: 'NEW', to: 'CONTACTED' }, staff.id],
      ['status_changed', { from: 'CONTACTED', to: 'QUALIFIED' }, staff.id],
      ['status_changed', { from: 'QUALIFIED', to: 'CONTACTED' }, staff.id],
    ]);
  });

  it('requires a reason to mark Won or Lost and saves it as a note', async () => {
    const lead = await createLead();
    const missing = await patch(lead.id, { status: 'LOST' });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({ fields: { reason: expect.any(String) } });
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe('NEW');

    expect((await patch(lead.id, { status: 'WON', reason: 'Signed the proposal.' })).status).toBe(
      200,
    );
    const notes = await db.leadNote.findMany({ where: { leadId: lead.id } });
    expect(notes.map((note) => note.body)).toEqual(['Signed the proposal.']);
    const actions = (await db.leadActivity.findMany({ where: { leadId: lead.id } })).map(
      (entry) => entry.action,
    );
    expect(actions.sort()).toEqual(['note_added', 'status_changed']);
  });

  it('changes and clears the owner, refusing inactive staff', async () => {
    const owner = await createUser({ email: 'owner@beyondai.test' });
    const inactive = await createUser({ email: 'gone@beyondai.test', active: false });
    const lead = await createLead();

    expect((await patch(lead.id, { ownerId: owner.id })).status).toBe(200);
    expect((await patch(lead.id, { ownerId: inactive.id })).status).toBe(400);
    expect((await patch(lead.id, { ownerId: null })).status).toBe(200);

    const activity = await db.leadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(activity.map((entry) => entry.detail)).toEqual([
      { from: null, to: owner.id },
      { from: owner.id, to: null },
    ]);
  });

  it('writes nothing when nothing changes', async () => {
    const lead = await createLead();
    const response = await patch(lead.id, { status: 'NEW', ownerId: null });
    await expect(response.json()).resolves.toMatchObject({ changed: false });
    expect(await db.leadActivity.count()).toBe(0);
  });

  it('refuses changes to a deleted lead with 409', async () => {
    const lead = await createLead({ deletedAt: new Date() });
    const response = await patch(lead.id, { status: 'CONTACTED' });
    expect(response.status).toBe(409);
    const note = await notesRoute.POST(
      appRequest(`/api/admin/leads/${lead.id}/notes`, { method: 'POST', body: { body: 'x' } }),
      params({ id: lead.id }),
    );
    expect(note.status).toBe(409);
  });

  it('accepts only the fields it expects', async () => {
    const lead = await createLead();
    expect((await patch(lead.id, { status: 'CONTACTED', deletedAt: null })).status).toBe(400);
    expect((await patch(lead.id, {})).status).toBe(400);
  });

  it('returns 404 for an unknown lead', async () => {
    expect((await patch('doesnotexist', { status: 'CONTACTED' })).status).toBe(404);
  });
});

describe('soft delete and restore', () => {
  it('hides the lead, logs both actions, and blocks double deletes', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    signInAs(admin);
    const lead = await createLead();
    const id = params({ id: lead.id });

    expect(
      (await leadRoute.DELETE(appRequest(`/api/admin/leads/${lead.id}`, { method: 'DELETE' }), id))
        .status,
    ).toBe(200);
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).deletedAt).not.toBeNull();
    expect(
      (await leadRoute.DELETE(appRequest(`/api/admin/leads/${lead.id}`, { method: 'DELETE' }), id))
        .status,
    ).toBe(409);

    expect(
      (
        await restoreRoute.POST(
          appRequest(`/api/admin/leads/${lead.id}/restore`, { method: 'POST' }),
          id,
        )
      ).status,
    ).toBe(200);
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).deletedAt).toBeNull();

    const actions = await db.leadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map((entry) => entry.action)).toEqual(['deleted', 'restored']);
  });
});

describe('activity log', () => {
  it('is append-only at the database level', async () => {
    const lead = await createLead();
    const entry = await db.leadActivity.create({ data: { leadId: lead.id, action: 'created' } });
    await expect(
      db.leadActivity.update({ where: { id: entry.id }, data: { action: 'deleted' } }),
    ).rejects.toThrow(/append-only/);
  });
});

describe('GET /api/admin/leads/export', () => {
  async function exportCsv(): Promise<{ response: Response; rows: string[] }> {
    const response = await exportRoute.GET(appRequest('/api/admin/leads/export'));
    const text = await response.text();
    return { response, rows: text.replace(/^﻿/, '').trim().split('\r\n') };
  }

  it('gives admins every enquiry in the view, with the expected columns', async () => {
    signInAs(await createUser({ role: 'ADMIN' }));
    await createLead({ fullName: 'One' });
    await createLead({ fullName: 'Two' });
    const { response, rows } = await exportCsv();

    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="enquiries-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(rows[0]).toBe(
      'id,created_at,full_name,work_email,organization,topic,interest_areas,preferred_call_time,message,status,owner,reply_due_at,first_contacted_at,overdue,source_page,utm_source,utm_medium,utm_campaign',
    );
    expect(rows).toHaveLength(3);
  });

  it('limits staff to the enquiries assigned to them', async () => {
    const staff = await createUser();
    signInAs(staff);
    await createLead({ fullName: 'Mine', ownerId: staff.id });
    await createLead({ fullName: 'Someone else' });
    const { rows } = await exportCsv();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('Mine');
  });

  it('neutralizes spreadsheet formulas in visitor text', async () => {
    signInAs(await createUser({ role: 'ADMIN' }));
    await createLead({ fullName: '=HYPERLINK("http://evil.example")' });
    const { rows } = await exportCsv();
    expect(rows[1]).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
  });
});

describe('GET /api/admin/overview', () => {
  it('counts new, overdue, topics, and conversion', async () => {
    signInAs(await createUser());
    await createLead({ topic: 'PRODUCT_DEMO' });
    await createLead({ topic: 'PRODUCT_DEMO', createdAt: hoursAgo(30) });
    await createLead({ topic: 'PARTNERSHIP', status: 'WON', createdAt: hoursAgo(48) });
    await createLead({ topic: 'PARTNERSHIP', createdAt: hoursAgo(24 * 40) });
    await createLead({ deletedAt: new Date() });

    const response = await overviewRoute.GET(appRequest('/api/admin/overview'));
    const body = (await response.json()) as {
      overdue: number;
      last30Days: {
        total: number;
        won: number;
        conversionRate: number;
        byTopic: { topic: string; count: number }[];
      };
      header: { newCount: number; overdueCount: number };
    };
    expect(body.overdue).toBe(2);
    expect(body.last30Days).toMatchObject({ total: 3, won: 1, conversionRate: 1 / 3 });
    expect(body.last30Days.byTopic.find((row) => row.topic === 'PRODUCT_DEMO')?.count).toBe(2);
    expect(body.header).toEqual({ newCount: 3, overdueCount: 2 });

    const header = await overviewRoute.GET(appRequest('/api/admin/overview?scope=header'));
    await expect(header.json()).resolves.toEqual({ newCount: 3, overdueCount: 2 });
  });
});
