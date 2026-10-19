import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINK_SENT_MESSAGE } from '../state';
import { LoginForm } from './login-form';

vi.mock('../actions', () => ({
  requestSignInLink: vi.fn(() => Promise.resolve({ status: 'sent', message: LINK_SENT_MESSAGE })),
}));

describe('LoginForm', () => {
  it('announces the generic confirmation after a request', async () => {
    render(<LoginForm callbackUrl="/leads" />);
    await userEvent.type(screen.getByLabelText('Work email'), 'staff@beyondai.ph');
    await userEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByRole('status')).toHaveTextContent(LINK_SENT_MESSAGE);
  });
});
