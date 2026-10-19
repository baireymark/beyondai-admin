import { hasActiveFilters, leadListSearch, type LeadListParams } from './query-string';

const base: LeadListParams = {
  overdue: false,
  deleted: false,
  page: 1,
  pageSize: 25,
  sort: 'createdAt_desc',
};

describe('leadListSearch', () => {
  it('is empty for the default view', () => {
    expect(leadListSearch(base)).toBe('');
  });

  it('keeps filters and leaves out defaults', () => {
    expect(leadListSearch({ ...base, status: 'NEW', overdue: true, q: 'maria santos' })).toBe(
      '?status=NEW&q=maria+santos&overdue=true',
    );
  });

  it('applies overrides such as the next page', () => {
    expect(leadListSearch({ ...base, topic: 'ERP' }, { page: 3, sort: 'status_asc' })).toBe(
      '?topic=ERP&sort=status_asc&page=3',
    );
  });
});

it('hasActiveFilters ignores paging and sorting', () => {
  expect(hasActiveFilters({ ...base, page: 4, sort: 'status_desc' })).toBe(false);
  expect(hasActiveFilters({ ...base, ownerId: 'me' })).toBe(true);
});
