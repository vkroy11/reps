// babel-preset-expo does NOT wire up the worklets plugin, so without this file
// every Reanimated animation silently fails at runtime.
//
// Reanimated 4 moved the transform into react-native-worklets, so the plugin is
// `react-native-worklets/plugin` — not the old `react-native-reanimated/plugin`.
// It must stay last in the plugin list.
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { reactCompiler: true }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
