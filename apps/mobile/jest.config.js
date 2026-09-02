const expoPreset = require('jest-expo/jest-preset');

/**
 * Icons are imported per glyph from Lucide's supported `icons/*` subpath, whose
 * exports map resolves to ESM under the react-native condition. Two things are
 * needed to make that work under Jest, and neither is Lucide's fault:
 *
 *   1. node_modules are not transformed by default, so the package is added to
 *      the preset's allow-list rather than replacing the pattern outright.
 *   2. The preset only transforms `.[jt]sx?`, so a `.mjs` file gets no
 *      transformer at all and fails with "Cannot use import statement outside
 *      a module". It reuses the same babel-jest config as the JS rule.
 *
 * Metro handles both natively; this is purely a Jest gap.
 */
const transformIgnorePatterns = expoPreset.transformIgnorePatterns.map((pattern) =>
  typeof pattern === 'string' && pattern.includes('(?!(')
    ? pattern.replace('(?!(', '(?!(lucide-react-native|')
    : pattern,
);

const jsTransform = expoPreset.transform['\\.[jt]sx?$'];

module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 keeps its worklet runtime in react-native-worklets, whose
  // .native entry points reach for a native module that does not exist under
  // Jest. This resolver is what the package ships to redirect those imports.
  resolver: 'react-native-worklets/jest/resolver.js',
  transformIgnorePatterns,
  transform: {
    ...expoPreset.transform,
    '\\.mjs$': jsTransform,
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Testing Library v14 extends expect on import, so no setupFilesAfterEach.
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
