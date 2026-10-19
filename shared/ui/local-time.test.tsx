import { render, screen } from '@testing-library/react';

import { LocalTime } from './local-time';

describe('LocalTime', () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the viewer's own time when their clock differs from Manila", () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60);
    render(<LocalTime date="2026-10-22T06:00:00.000Z" />);
    expect(screen.getByText(/^Your time: /)).toBeInTheDocument();
  });

  it('shows nothing when the viewer is on UTC+8 already', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
    const { container } = render(<LocalTime date="2026-10-22T06:00:00.000Z" />);
    expect(container).toBeEmptyDOMElement();
  });
});
