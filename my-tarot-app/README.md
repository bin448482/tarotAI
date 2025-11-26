# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.



cd "D:\0-development\projects\MySixth\my-tarot-app"
  npx expo login

  然后输入你的 Expo 账户邮箱和密码。

  登录完成后，我们就可以开始云构建了。构建命令如下：

  # 构建 APK 预览版本
  npx eas build --platform android --profile preview

  # 或者构建生产版本的 AAB 文件
  npx eas build --platform android --profile production

  EAS Build 配置说明：

  我已经为你创建了 eas.json 配置文件，包含三个构建配置：

  1. development: 开发版本，支持开发客户端
  2. preview: 预览版本，生成 APK 文件（适合直接安装测试）
  3. production: 生产版本，生成 AAB 文件（适合上传 Google Play）

  如果你想要直接安装的 APK 文件，建议使用 preview 配置。

  请先手动登录 Expo 账户，然后告诉我，我会帮你执行构建命令。

  本地重建：

   确认：本地构建 APK 步骤

  # 1. 进入项目目录
  cd D:\0-development\projects\MySixth\my-tarot-app

  # 2. 重新生成原生项目（应用新的 splash screen 配置）
  npx expo prebuild --platform android --clean

  # 3. 构建 APK
  cd android
  .\gradlew.bat assembleRelease


$pkg = 'com.biiinnn.mytarotapp'
adb shell pidof -s $pkg 
adb logcat -v time --pid 23405 

## 发布到 Google Play（Internal 轨）

你可以选择自动上传（GPP）或手动上传（控制台）。

- 自动上传（GPP）
  - 将运行（需要联网许可）：
    - 在 `my-tarot-app/android` 目录：
      - 设置环境：`NODE_ENV=production`
      - 验证权限：`.\gradlew.bat :app:bootstrap`
      - 上传发布：`.\gradlew.bat :app:publishRelease`
  - 说明：当前 `track=internal`；如需改为 `closed/production`，可在 `android/app/build.gradle` 的 `play { track.set(...) }` 修改或使用命令行参数覆盖。
  - 风险提示：若 Play 包名与 app 的 `applicationId` 不一致会 404。当前 `applicationId` 为 `com.biiinnn.mytarotapp`（文件：`my-tarot-app/android/app/build.gradle`）。请确认与 Play 上的包名一致。

- 手动上传（控制台）
  - AAB 文件路径：
    - `my-tarot-app/android/app/build/outputs/bundle/release/app-release.aab`
  - 控制台：版本管理 → Internal 轨 → 创建新版本 → 上传 AAB
