const { getDefaultConfig } = require('expo/metro-config')

module.exports = (() => {
  const config = getDefaultConfig(__dirname)

  // 确保包含必要的asset扩展
  config.resolver.assetExts = [
    ...config.resolver.assetExts,
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'ttf', 'otf', 'db', 'json'
  ]

  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    'cjs', 'mjs'
  ]

  return config
})()