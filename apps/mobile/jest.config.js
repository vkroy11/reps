module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
