/** Accounts and saved sessions created by global-setup.ts. */
export const STAFF_STATE = 'tests/e2e/.auth/staff.json';
export const ADMIN_STATE = 'tests/e2e/.auth/admin.json';
export const STAFF_EMAIL = 'e2e-staff@beyondai.test';
export const ADMIN_EMAIL = 'e2e-admin@beyondai.test';

/** The public site origin allowed to post enquiries in E2E runs. */
export const PUBLIC_ORIGIN = process.env.E2E_PUBLIC_ORIGIN ?? 'http://localhost:3000';
