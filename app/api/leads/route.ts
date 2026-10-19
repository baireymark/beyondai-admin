import { enquiryPreflight, submitEnquiry } from '@/features/leads/server';

// Public endpoint for the beyondai.ph contact form. See
// features/leads/server/submit-enquiry.ts for the order of checks.
export function POST(request: Request): Promise<Response> {
  return submitEnquiry(request);
}

export function OPTIONS(request: Request): Response {
  return enquiryPreflight(request);
}
