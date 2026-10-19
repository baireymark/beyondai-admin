import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

import { server } from '@/tests/fixtures/server';

// Fail on any request a test did not mock, so tests never hit a real network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
