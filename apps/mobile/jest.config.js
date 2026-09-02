module.exports = {
  preset: 'jest-expo',
  // Testing Library v14 extends expect on import, so no setup file is needed.
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
