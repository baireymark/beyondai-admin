/** The request body from Planning/README.md section 10.1, valid as written. */
export const validEnquiry = {
  fullName: 'Maria Santos',
  workEmail: 'maria@example.com',
  organization: 'Example Corp',
  topic: 'PRODUCT_DEMO',
  interestAreas: ['ERP', 'HRM_SOFTWARE'],
  preferredCallTime: '2026-10-22T14:00:00+08:00',
  message: 'We are looking at replacing our HR system next quarter.',
  consent: true,
  consentVersion: '2026-10',
  turnstileToken: 'token',
  companyUrl: '',
  sourcePage: '/contact',
  utm: { source: 'linkedin', medium: 'social', campaign: 'q4-launch' },
};
