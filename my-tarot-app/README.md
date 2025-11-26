# My Tarot App (Expo)

Cross-platform Expo React Native client delivering the four-step tarot journey with offline-ready data and paid AI insights.

## 1. 项目简介 | Description
`my-tarot-app` 是 TarotAI 的移动端入口，基于 Expo SDK 54 / React Native 0.81。应用提供神秘塔罗首页、四步骤占卜（模式选择→描述→抽牌→解读）、历史记录与付费 AI 解读。支持匿名用户、远程 FastAPI API，以及 Google Play IAP / 兑换码充值策略，目标是 iOS/Android 双平台统一交付。

## 2. 功能特性 | Features
- 🎴 Guided readings: 3-card 与 Celtic Cross 牌阵、静态牌义 + LLM 付费扩展。
- 🤖 AI integration: `/readings/analyze` + `/readings/generate` 双阶段调用，含免费/付费视图切换。
- 📜 History & offline cache: Expo SQLite 初始化 `tarot_config.db`，支持离线同步与占卜记录回放。
- 💳 Recharge routing: 设备支持 IAP 时启用 Google Play Billing，否则展示兑换码充值入口。
- 🖼️ Asset pipeline: `assetBundlePatterns` 打包图片/数据库，脚本自动生成 iOS/Android 图标。
- 🚀 EAS build ready: `eas.json` 定义 `development`, `preview`, `production` 三种 profile。

## 3. 技术栈 | Tech Stack
- **Language**: TypeScript 5.9
- **Framework**: Expo SDK 54, React Native 0.81, Expo Router 6, React Navigation 7, Tamagui UI
- **State/Data**: Zustand, SWR (light), Expo SQLite, Expo FileSystem
- **Others**: EAS Build, react-native-reanimated 4, expo-asset, Google Play Billing (via `react-native-iap`)

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js 18+
- npm 10+ 或 yarn
- Expo CLI (`npx expo` 内置)
- Android Studio / Xcode (可选，用于模拟器)
- Expo 账户（云构建、EAS 所需）

### 安装步骤 | Setup
```bash
# 1. Install deps
cd my-tarot-app
npm ci

# 2. Health check & start
npx expo-doctor --verbose
npx expo start -c

# 3. Run on target
i  # iOS 模拟器 (macOS)
a  # Android 模拟器
e  # Expo Go

# 4. EAS build (login first: npx expo login)
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

- Android 包名：`com.biiinnn.mytarotapp`，可通过 `ANDROID_PACKAGE` 环境变量覆盖。
- 预置数据库：`assets/db/tarot_config.db`，首次启动会复制到 `FileSystem.DocumentDirectory + /SQLite/`。
- 图标脚本：`node scripts/generate-icons.js <src>`、`node scripts/generate-ios-appicon.js <src>`。
- 若需手动 Gradle 构建：`npx expo prebuild --platform android --clean && cd android && ./gradlew assembleRelease`。
- Google Play 发布：可使用 Gradle Play Publisher (`./gradlew :app:publishRelease`) 或上传 `app-release.aab` 至控制台。

更多流程细节请参考 `CLAUDE.md` 与根目录 `README_CN.md`。
