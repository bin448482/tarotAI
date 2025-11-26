const { withAndroidManifest } = require('@expo/config-plugins');

// 标签页配置
const tabsConfig = {
  // 控制标签栏的显示/隐藏
  tabBarEnabled: false,

  // 可选：如果需要保留单个标签页的配置
  tabs: {
    home: {
      enabled: true,
      title: 'Home',
      icon: 'house.fill',
    },
    explore: {
      enabled: true,
      title: 'Explore',
      icon: 'paperplane.fill',
    },
  },
};

module.exports = ({ config }) => {
  // 合并现有 app.json 配置，并显式设置 android.package（EAS 构建必需）
  let appConfig = {
    ...config,
    // 添加自定义标签页配置
    extra: {
      ...config.extra,
      tabsConfig,
    },
    android: {
      ...config.android,
      // 优先使用 app.json 中声明的包名；否则允许用环境变量覆盖；再否则使用默认值
      package:
        (config.android && config.android.package) ||
        process.env.ANDROID_PACKAGE ||
        'com.mysixth.tarot',
    },
  };

  // 确保启用 R8/ProGuard 并写入常见的 keep 规则，以便生成 mapping.txt 上传到 Play Console
  // 使用 expo-build-properties 插件注入到原生构建配置
  // 仅在本地已安装 expo-build-properties 时才注入插件，避免原生构建因缺包中断
  let canUseBuildProps = false;
  try {
    require.resolve('expo-build-properties');
    canUseBuildProps = true;
  } catch (e) {
    // optional plugin; skip if not installed
  }
  const buildPropsPlugin = canUseBuildProps
    ? [
        'expo-build-properties',
        {
          android: {
            gradleProperties: {
              enableProguardInReleaseBuilds: 'true',
            },
            // 以换行拼接为单个字符串（插件要求）
            extraProguardRules: [
              '-keep class com.facebook.react.** { *; }',
              '-keep class com.facebook.hermes.** { *; }',
              '-keep class com.swmansion.gesturehandler.** { *; }',
              '-keep class com.swmansion.reanimated.** { *; }',
              '-keep class expo.modules.** { *; }',
              '-keep class com.google.android.gms.** { *; }',
            ].join('\\n'),
          },
        },
      ]
    : null;
  const existingPlugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  if (buildPropsPlugin) {
    const hasBuildProps = existingPlugins.some((p) =>
      (Array.isArray(p) ? p[0] : p) === 'expo-build-properties'
    );
    if (!hasBuildProps) {
      existingPlugins.push(buildPropsPlugin);
    }
  }
  appConfig.plugins = existingPlugins;

  appConfig = withAndroidManifest(appConfig, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application ?? [];
    if (application.length > 0) {
      application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return manifestConfig;
  });

  return appConfig;
};
