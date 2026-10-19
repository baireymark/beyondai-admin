import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LeadStatusForm } from './lead-status-form';

vi.mock('../actions', () => ({
  updateLeadAction: vi.fn(() =>
    Promise.resolve({
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: { reason: 'Add a short reason when marking an enquiry Won or Lost' },
    }),
  ),
}));

const people = [
  { id: 'u1', name: 'Ana Cruz', email: 'ana@beyondai.ph' },
  { id: 'u2', name: null, email: 'jose@beyondai.ph' },
];

function renderForm(disabled = false) {
  render(
    <LeadStatusForm
      leadId="lead1"
      status="CONTACTED"
      ownerId="u1"
      people={people}
      disabled={disabled}
    />,
  );
}

describe('LeadStatusForm', () => {
  it('shows the current status and owner', () => {
    renderForm();
    expect(screen.getByLabelText('Status')).toHaveValue('CONTACTED');
    expect(screen.getByLabelText('Owner')).toHaveValue('u1');
    expect(screen.getByRole('option', { name: 'jose@beyondai.ph' })).toBeInTheDocument();
  });

  it('asks for a reason only when moving to Won or Lost', async () => {
    renderForm();
    expect(screen.queryByLabelText(/Reason for marking/)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'LOST');
    expect(screen.getByLabelText('Reason for marking Lost')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'QUALIFIED');
    expect(screen.queryByLabelText(/Reason for marking/)).not.toBeInTheDocument();
  });

  it('shows the server error next to the reason field', async () => {
    renderForm();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'WON');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const reason = await screen.findByLabelText('Reason for marking Won');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription(
      'Saved as a note on this enquiry. Add a short reason when marking an enquiry Won or Lost',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Please fix the highlighted fields.');
  });

  it('is read-only for a deleted enquiry', () => {
    renderForm(true);
    expect(screen.getByLabelText('Status')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });
});
