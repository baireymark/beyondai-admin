import 'server-only';

// Server-only entry point of the leads feature. Route handlers, pages, and
// Server Actions import from here; client components never do.
export { createLead, type CreatedLead } from './server/create-lead';
export { restoreLead, softDeleteLead } from './server/delete-lead';
export { EXPORT_COLUMNS, EXPORT_ROW_LIMIT, exportLeadsCsv } from './server/export-leads';
export { getLead, type LeadDetail } from './server/get-lead';
export {
  buildLeadWhere,
  listAssignableUsers,
  listLeads,
  type LeadListItem,
  type LeadListPage,
} from './server/list-leads';
export { addNote } from './server/notes';
export { ENQUIRY_BODY_LIMIT_BYTES, enquiryPreflight, submitEnquiry } from './server/submit-enquiry';
export { getHeaderCounts, getOverview, type HeaderCounts, type Overview } from './server/overview';
export type { Actor, LeadError, Person } from './server/types';
export { updateLead, type UpdatedLead } from './server/update-lead';
export {
  enquirySchema,
  leadListQuerySchema,
  leadUpdateSchema,
  noteSchema,
  parseLeadListQueryLenient,
  toQueryRecord,
  type EnquiryInput,
  type LeadListQuery,
  type LeadUpdateInput,
  type QueryRecord,
} from './schema';
