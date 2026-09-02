// Gesture Handler needs its own mock before anything imports it, and the root
// layout wraps the app in GestureHandlerRootView.
require('react-native-gesture-handler/jestSetup');

// AsyncStorage's native module is null under Jest; the package ships a mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
