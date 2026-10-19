import * as userRoute from '@/app/api/admin/users/[id]/route';
import * as usersRoute from '@/app/api/admin/users/route';
import { appRequest, createUser, db, params, signInAs } from './helpers';

function addUser(body: unknown): Promise<Response> {
  return usersRoute.POST(appRequest('/api/admin/users', { method: 'POST', body }));
}

function patchUser(id: string, body: unknown): Promise<Response> {
  return userRoute.PATCH(
    appRequest(`/api/admin/users/${id}`, { method: 'PATCH', body }),
    params({ id }),
  );
}

describe('admin user management', () => {
  let admin: Awaited<ReturnType<typeof createUser>>;
  beforeEach(async () => {
    admin = await createUser({ role: 'ADMIN', email: 'admin@beyondai.test' });
    signInAs(admin);
  });

  it('adds an email to the allowlist in lower case, as staff by default', async () => {
    const response = await addUser({ email: '  Ana.Cruz@BeyondAI.ph ', name: 'Ana Cruz' });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      email: 'ana.cruz@beyondai.ph',
      role: 'STAFF',
      active: true,
    });
  });

  it('refuses a duplicate email', async () => {
    await addUser({ email: 'ana@beyondai.ph', name: 'Ana' });
    const response = await addUser({ email: 'ANA@beyondai.ph', name: 'Ana again' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      fields: { email: 'This email already has access' },
    });
  });

  it('changes a role and deactivates an account, ending its sessions', async () => {
    const staff = await createUser({ email: 'staff@beyondai.test' });
    await db.session.create({
      data: {
        sessionToken: 'token-1',
        userId: staff.id,
        expires: new Date(Date.now() + 3_600_000),
      },
    });

    expect((await patchUser(staff.id, { role: 'ADMIN' })).status).toBe(200);
    const response = await patchUser(staff.id, { active: false });
    await expect(response.json()).resolves.toMatchObject({ role: 'ADMIN', active: false });
    expect(await db.session.count({ where: { userId: staff.id } })).toBe(0);
  });

  it('stops admins from demoting or deactivating themselves', async () => {
    expect((await patchUser(admin.id, { role: 'STAFF' })).status).toBe(403);
    expect((await patchUser(admin.id, { active: false })).status).toBe(403);
    expect((await patchUser(admin.id, { name: 'Still me' })).status).toBe(200);
  });

  it('lists accounts and rejects unexpected fields', async () => {
    const list = await usersRoute.GET(appRequest('/api/admin/users'));
    expect(((await list.json()) as unknown[]).length).toBe(1);
    expect((await addUser({ email: 'x@beyondai.ph', name: 'X', isAdmin: true })).status).toBe(400);
    expect((await patchUser('missing', { name: 'Nobody' })).status).toBe(404);
  });
});
