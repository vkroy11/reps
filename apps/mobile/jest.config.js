module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 keeps its worklet runtime in react-native-worklets, whose
  // .native entry points reach for a native module that does not exist under
  // Jest. This resolver is what the package ships to redirect those imports.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Testing Library v14 extends expect on import, so no setupFilesAfterEach.
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
