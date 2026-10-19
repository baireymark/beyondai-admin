import { toFieldErrors } from '@/shared/lib/zod-errors';
import { validEnquiry } from '@/tests/fixtures/enquiry';
import {
  enquirySchema,
  leadListQuerySchema,
  leadUpdateSchema,
  parseLeadListQueryLenient,
} from './schema';

function errorsFor(input: unknown) {
  const result = enquirySchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

describe('enquirySchema', () => {
  it('accepts the documented example and converts the call time to a Date', () => {
    const result = enquirySchema.parse(validEnquiry);
    expect(result.preferredCallTime?.toISOString()).toBe('2026-10-22T06:00:00.000Z');
    expect(result.organization).toBe('Example Corp');
  });

  it('treats blank optional fields as not provided', () => {
    const result = enquirySchema.parse({
      ...validEnquiry,
      organization: '  ',
      preferredCallTime: '',
      sourcePage: '',
      utm: null,
      interestAreas: undefined,
    });
    expect(result).toMatchObject({
      organization: null,
      preferredCallTime: null,
      sourcePage: null,
      utm: null,
      interestAreas: [],
    });
  });

  it('reports one readable message per invalid field', () => {
    expect(
      errorsFor({
        ...validEnquiry,
        fullName: 'M',
        workEmail: 'not-an-email',
        topic: 'NOPE',
        message: 'short',
        consent: false,
      }),
    ).toEqual({
      fullName: 'Enter your full name',
      workEmail: 'Enter a valid email address',
      topic: 'Choose a topic',
      message: 'Write at least 10 characters',
      consent: 'Agree to the privacy notice to continue',
    });
  });

  it('enforces the interest list, its size, and uniqueness', () => {
    expect(errorsFor({ ...validEnquiry, interestAreas: ['MADE_UP'] })).toEqual({
      'interestAreas.0': 'Choose from the listed areas',
    });
    expect(errorsFor({ ...validEnquiry, interestAreas: ['ERP', 'ERP'] })).toEqual({
      interestAreas: 'Choose each area once',
    });
    expect(
      errorsFor({
        ...validEnquiry,
        interestAreas: [
          'ERP',
          'HRM_SOFTWARE',
          'AGENTIC_AI',
          'TALKORA_AI',
          'COUNT_TRUST',
          'NOT_SURE',
        ],
      }),
    ).toEqual({ interestAreas: 'Choose up to 5 areas' });
  });

  it('rejects unknown fields, including nested ones', () => {
    expect(errorsFor({ ...validEnquiry, isAdmin: true, utm: { source: 'x', term: 'y' } })).toEqual({
      isAdmin: 'Unknown field',
      'utm.term': 'Unknown field',
    });
  });

  it('requires a time zone on the preferred call time', () => {
    expect(errorsFor({ ...validEnquiry, preferredCallTime: '2026-10-22T14:00:00' })).toEqual({
      preferredCallTime: 'Enter a valid date and time',
    });
  });

  it('enforces length limits', () => {
    expect(errorsFor({ ...validEnquiry, message: 'x'.repeat(2001) })).toEqual({
      message: 'Use 2,000 characters or fewer',
    });
  });
});

describe('leadUpdateSchema', () => {
  it('needs a status or an owner', () => {
    expect(leadUpdateSchema.safeParse({}).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ ownerId: null }).success).toBe(true);
  });

  it('rejects fields it does not expect', () => {
    expect(leadUpdateSchema.safeParse({ status: 'WON', deletedAt: null }).success).toBe(false);
  });
});

describe('lead list query', () => {
  it('applies defaults', () => {
    expect(leadListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 25,
      sort: 'createdAt_desc',
      overdue: false,
      deleted: false,
    });
  });

  it('caps the page size', () => {
    expect(leadListQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('keeps valid filters and drops invalid ones in the lenient parser', () => {
    const query = parseLeadListQueryLenient({ status: 'WON', topic: 'NOPE', page: '2', q: '' });
    expect(query).toMatchObject({ status: 'WON', page: 2 });
    expect(query.topic).toBeUndefined();
    expect(query.q).toBeUndefined();
  });
});
