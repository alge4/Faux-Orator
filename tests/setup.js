import "@testing-library/jest-dom";

// Mock fetch globally
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
