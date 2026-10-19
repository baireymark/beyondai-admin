import * as leadRoute from '@/app/api/admin/leads/[id]/route';
import * as notesRoute from '@/app/api/admin/leads/[id]/notes/route';
import * as restoreRoute from '@/app/api/admin/leads/[id]/restore/route';
import * as exportRoute from '@/app/api/admin/leads/export/route';
import * as listRoute from '@/app/api/admin/leads/route';
import * as overviewRoute from '@/app/api/admin/overview/route';
import * as privacyExportRoute from '@/app/api/admin/privacy/export/route';
import * as userRoute from '@/app/api/admin/users/[id]/route';
import * as usersRoute from '@/app/api/admin/users/route';
import { appRequest, createLead, createUser, params, signInAs } from './helpers';

/** Every admin endpoint, with a request that would succeed for the right role. */
async function endpoints() {
  const lead = await createLead();
  const other = await createUser({ email: 'other@beyondai.test' });
  const id = params({ id: lead.id });
  const privacyForm = () => {
    const form = new FormData();
    form.set('email', 'maria@example.com');
    return new Request('http://localhost:3001/api/admin/privacy/export', {
      method: 'POST',
      headers: { origin: 'http://localhost:3001' },
      body: form,
    });
  };
  return {
    staffAllowed: [
      ['GET overview', () => overviewRoute.GET(appRequest('/api/admin/overview'))],
      ['GET leads', () => listRoute.GET(appRequest('/api/admin/leads'))],
      ['GET export', () => exportRoute.GET(appRequest('/api/admin/leads/export'))],
      ['GET lead', () => leadRoute.GET(appRequest(`/api/admin/leads/${lead.id}`), id)],
      [
        'PATCH lead',
        () =>
          leadRoute.PATCH(
            appRequest(`/api/admin/leads/${lead.id}`, {
              method: 'PATCH',
              body: { status: 'CONTACTED' },
            }),
            id,
          ),
      ],
      [
        'POST note',
        () =>
          notesRoute.POST(
            appRequest(`/api/admin/leads/${lead.id}/notes`, {
              method: 'POST',
              body: { body: 'Hi' },
            }),
            id,
          ),
      ],
    ] as const,
    adminOnly: [
      [
        'DELETE lead',
        () => leadRoute.DELETE(appRequest(`/api/admin/leads/${lead.id}`, { method: 'DELETE' }), id),
      ],
      [
        'POST restore',
        () =>
          restoreRoute.POST(
            appRequest(`/api/admin/leads/${lead.id}/restore`, { method: 'POST' }),
            id,
          ),
      ],
      ['GET users', () => usersRoute.GET(appRequest('/api/admin/users'))],
      [
        'POST users',
        () =>
          usersRoute.POST(
            appRequest('/api/admin/users', {
              method: 'POST',
              body: { email: 'new@beyondai.test', name: 'New' },
            }),
          ),
      ],
      [
        'PATCH user',
        () =>
          userRoute.PATCH(
            appRequest(`/api/admin/users/${other.id}`, {
              method: 'PATCH',
              body: { name: 'Renamed' },
            }),
            params({ id: other.id }),
          ),
      ],
      ['POST privacy export', () => privacyExportRoute.POST(privacyForm())],
    ] as const,
  };
}

describe('admin API access', () => {
  it('returns 401 for every endpoint without a session', async () => {
    signInAs(null);
    const { staffAllowed, adminOnly } = await endpoints();
    for (const [name, call] of [...staffAllowed, ...adminOnly]) {
      const response = await call();
      expect(response.status, name).toBe(401);
    }
  });

  it('returns 401 when the account has been deactivated', async () => {
    signInAs(await createUser({ active: false }));
    const response = await listRoute.GET(appRequest('/api/admin/leads'));
    expect(response.status).toBe(401);
  });

  it('lets staff use staff endpoints and refuses admin-only ones with 403', async () => {
    signInAs(await createUser({ role: 'STAFF' }));
    const { staffAllowed, adminOnly } = await endpoints();
    for (const [name, call] of staffAllowed) {
      expect((await call()).status, name).toBeLessThan(300);
    }
    for (const [name, call] of adminOnly) {
      expect((await call()).status, name).toBe(403);
    }
  });

  it('lets admins use every endpoint', async () => {
    signInAs(await createUser({ role: 'ADMIN' }));
    const { staffAllowed, adminOnly } = await endpoints();
    for (const [name, call] of [...staffAllowed, ...adminOnly]) {
      expect((await call()).status, name).toBeLessThan(300);
    }
  });

  it('refuses state-changing requests from another origin or with no origin', async () => {
    signInAs(await createUser({ role: 'ADMIN' }));
    const lead = await createLead();
    for (const origin of ['https://evil.example', null]) {
      const response = await leadRoute.PATCH(
        appRequest(`/api/admin/leads/${lead.id}`, {
          method: 'PATCH',
          body: { status: 'WON', reason: 'x' },
          origin,
        }),
        params({ id: lead.id }),
      );
      expect(response.status).toBe(403);
    }
  });

  it('never sends CORS headers from admin endpoints', async () => {
    signInAs(await createUser());
    const response = await listRoute.GET(
      appRequest('/api/admin/leads', { origin: 'https://beyondai.ph' }),
    );
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
