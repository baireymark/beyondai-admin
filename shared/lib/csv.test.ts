import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins cells and rows with commas and CRLF', () => {
    expect(
      toCsv([
        ['a', 1, true],
        ['b', null, undefined],
      ]),
    ).toBe('a,1,true\r\nb,,\r\n');
  });

  it('quotes cells with commas, quotes, or line breaks', () => {
    expect(toCsv([['Santos, Maria', 'say "hi"', 'line\nbreak']])).toBe(
      '"Santos, Maria","say ""hi""","line\nbreak"\r\n',
    );
  });

  it('neutralizes cells that a spreadsheet would run as a formula', () => {
    expect(toCsv([['=HYPERLINK("http://evil")', '+1', '-2', '@SUM(A1)']])).toBe(
      `"'=HYPERLINK(""http://evil"")",'+1,'-2,'@SUM(A1)\r\n`,
    );
  });

  it('writes dates as ISO 8601', () => {
    expect(toCsv([[new Date('2026-10-19T01:00:00Z')]])).toBe('2026-10-19T01:00:00.000Z\r\n');
  });
});
