import { logger, redact } from './logger';

describe('redact', () => {
  it('replaces values under personal or secret keys', () => {
    expect(
      redact({
        workEmail: 'maria@example.com',
        fullName: 'Maria Santos',
        message: 'Call me',
        turnstileToken: 'abc',
        status: 201,
      }),
    ).toEqual({
      workEmail: '[redacted]',
      fullName: '[redacted]',
      message: '[redacted]',
      turnstileToken: '[redacted]',
      status: 201,
    });
  });

  it('masks emails and phone numbers inside other strings', () => {
    expect(redact('Lead from maria@example.com, phone +63 917 123 4567')).toBe(
      'Lead from [email], phone [phone]',
    );
  });

  it('leaves ids, dates, and counts readable', () => {
    expect(redact({ leadId: 'cm0abc123', at: '2026-10-19T09:46:05.000Z', count: 3 })).toEqual({
      leadId: 'cm0abc123',
      at: '2026-10-19T09:46:05.000Z',
      count: 3,
    });
  });

  it('redacts nested objects and arrays', () => {
    expect(redact({ detail: { items: [{ email: 'a@b.co' }] } })).toEqual({
      detail: { items: [{ email: '[redacted]' }] },
    });
  });

  it('scrubs error messages', () => {
    const result = redact({ error: new Error('Failed for maria@example.com') }) as {
      error: { errorMessage: string };
    };
    expect(result.error.errorMessage).toBe('Failed for [email]');
  });
});

describe('logger', () => {
  it('writes one JSON line without personal data', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('lead_create_failed', { workEmail: 'maria@example.com', leadId: 'x1' });
    const line = JSON.parse(spy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(line).toMatchObject({
      level: 'error',
      event: 'lead_create_failed',
      workEmail: '[redacted]',
      leadId: 'x1',
    });
    expect(JSON.stringify(line)).not.toContain('maria@example.com');
    spy.mockRestore();
  });
});
