import type { Preview } from '@storybook/nextjs-vite';

import '../app/globals.css';

const preview: Preview = {
  parameters: {
    // Fail the a11y panel check on violations rather than only reporting them.
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
