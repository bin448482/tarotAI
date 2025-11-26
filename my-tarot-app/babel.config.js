module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 使用 Reanimated 插件；与 react-native-worklets 插件不要同时启用
      'react-native-reanimated/plugin',
    ],
  };
};
