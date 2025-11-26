# my-tarot-app 打包与发布说明

本说明总结了近期为解决 EAS 云打包失败、资源未打包、图标更新等问题所做的修复与配置，并给出本地开发与云构建的标准流程。

## 1. 依赖与版本对齐
- Expo SDK: 54
- React Native: 0.81.4
- React: 19.1.0
- Tamagui: ^1.135.0（升级以兼容 RN 0.81，避免对 ^0.79 的旧 peer 依赖）
- 其它按 Expo 建议的小版本：
  - expo-router ~6.0.10
  - expo-file-system ~19.0.16
  - expo-web-browser ~15.0.8
  - expo-device ~8.0.9
  - react-native-reanimated ~4.1.1

命令参考：
```
npx expo install --check
npx expo install
```

常见冲突：若 npm ci 报 ERESOLVE（多见 tamagui 与 RN 版本冲突），请将 tamagui 全家桶升级到 ^1.135.0，并使用 RN 0.81.4。

## 2. EAS 云打包必备配置
- `app.config.js` 需声明 `android.package`：
  - 默认：`com.biiinnn.mytarotapp`
  - 可用环境变量覆盖：`ANDROID_PACKAGE`
- `eas.json` 已包含 `preview`、`production` 配置，版本来源 `remote`。

构建命令：
```
eas build -p android --profile preview
```

若遇到 "Failed to upload metadata 400"，通常不是致命错误；关键看后续 Install dependencies 与 Gradle 任务是否通过。

## 3. Babel 与 Metro 配置
- `babel.config.js`：仅启用 `react-native-reanimated/plugin`（置于最后）。不要同时启用 `react-native-worklets/plugin`，否则会出现 Duplicate plugin/preset 错误。
- `metro.config.js`：已确保包含 `db`、`png`、`jpg` 等资源扩展。

## 4. 资产打包（图片与数据库）
- `app.json` 新增：
```
"assetBundlePatterns": [
  "assets/images/**/*",
  "assets/db/**/*",
  "assets/data/**/*"
]
```
- 图片：代码通过 `require(...)` 的静态引用会自动打包。
- 预置数据库：`assets/db/tarot_config.db`，代码中使用：
  - `Asset.fromModule(require('../../assets/db/tarot_config.db'))` 加载
  - 复制到 `FileSystem.DocumentDirectory/SQLite/` 后，再 `SQLite.openDatabaseSync()` 打开。

如果 APK 安装后仍提示找不到资源，请先确认资源路径是否被静态引用或被 `assetBundlePatterns` 覆盖。

## 5. 缩小上传体积
- `.easignore` 已排除原生构建产物和缓存：
  - `android/.gradle/`, `android/build/`, `android/app/build/`, `android/.cxx/`, `android/local.properties`, `android/app/debug.keystore`, `.gradle/`, `.idea/`, `*.iml` 等。

## 6. 应用图标更新
- Android 与通用图标
  - 目标文件：
    - `assets/images/icon.png`（1024x1024）
    - `assets/images/android-icon-foreground.png`（432x432）
    - `assets/images/android-icon-monochrome.png`（432x432）
  - `app.json` 已指向上述路径。
  - 生成脚本：`scripts/generate-icons.js`
    - 用法：
      ```
      node scripts/generate-icons.js "<源图片路径>"
      ```

- iOS AppIcon 全集
  - 输出目录：`assets/ios/AppIcon.appiconset`
  - 已包含 iPhone/iPad 通知、设置、Spotlight、App、App Store（1024）完整规格，以及 `Contents.json`
  - 生成脚本：`scripts/generate-ios-appicon.js`
    - 用法：
      ```
      node scripts/generate-ios-appicon.js  # 默认使用 assets/images/icon.png
      node scripts/generate-ios-appicon.js "<自定义源图>"
      ```
  - 托管工作流（Managed）下，Expo 会从 `app.json.icon` 自动生成 iOS 图标；`AppIcon.appiconset` 主要用于预构建/裸工程（Bare）场景。

## 7. 本地开发与验证
```
npm ci
npx expo-doctor --verbose
npx expo start -c
```
- 首次启动会初始化数据库并复制预置 DB。
- 如遇 `react-native-web` 重复版本警告（由 @tamagui/static 引入），对 Android 原生构建无影响；如需彻底清理可使用 `overrides` 强制统一版本。

## 8. 常见问题速查
- Duplicate plugin/preset：移除 `react-native-worklets/plugin`，保留 `react-native-reanimated/plugin`。
- npm ERESOLVE（tamagui vs RN）：把 tamagui 全家桶升到 ^1.135.0，并用 RN 0.81.4。
- 资源未打包：补充 `assetBundlePatterns`；确保通过 `require(...)` 静态引用或由 patterns 覆盖。
- EAS 400 metadata：通常可忽略，关注后续安装依赖/Gradle 结果。

## 9. 变更清单（已经完成）
- 更新：`package.json`（tamagui 升级、Expo 小版本对齐、RN=0.81.4）
- 更新：`babel.config.js`（仅保留 reanimated 插件）
- 更新：`app.json`（添加 assetBundlePatterns；关闭 reactCompiler 实验）
- 更新：`app.config.js`（添加 android.package）
- 更新：`.easignore`（排除原生构建产物与缓存）
- 新增脚本：`scripts/generate-icons.js`、`scripts/generate-ios-appicon.js`
- 生成资源：`assets/images/icon.png`、`android-icon-foreground.png`、`android-icon-monochrome.png`、`assets/ios/AppIcon.appiconset/*`

## 10. 后续建议
- 若未来新增原生库或修改 Expo 插件配置，请执行 `npx expo prebuild --clean` 同步原生工程（在需要裸工程时）。
- 每次升级 Expo SDK，优先运行 `npx expo-doctor` 与 `npx expo install --check` 对齐小版本。
- 封版发布前，在真机上安装 APK 验证数据库初始化、图片加载与冷启动性能。

## Docker Quickstart (Backend + Admin + Nginx)

Prerequisites
- Docker Desktop (Linux containers) and WSL enabled on Windows.

Build & Run
- In repo root:
  - docker compose build
  - docker compose up -d
- Check status/logs:
  - docker compose ps
  - docker compose logs backend
  - docker compose logs admin
  - docker compose logs nginx

Verify
- Admin UI (via nginx): http://localhost/
- Backend health (direct): http://localhost:8000/health
  - Note: `/api/health` is not defined behind nginx; real APIs are under `/api/v1/*`.
- Admin API smoke (via nginx):
  - Login (default dev creds): POST http://localhost/api/v1/admin-api/login, body `{ "username":"admin", "password":"admin123" }`
  - With returned `access_token`, call: GET http://localhost/api/v1/admin-api/profile with header `Authorization: Bearer <token>`

Database (SQLite) Persistence
- Persistent volume `backend_data` stores `/data/backend_tarot.db` in backend container.
- Download backup:
  - docker cp backend:/data/backend_tarot.db ./backend_tarot.db
- Safe replace (with integrity check):
  - docker cp ./backend_tarot.db backend:/data/backend_tarot.new
  - docker exec backend sh -lc "sqlite3 /data/backend_tarot.new 'PRAGMA integrity_check;' && mv /data/backend_tarot.db /data/backend_tarot.bak && mv /data/backend_tarot.new /data/backend_tarot.db"

Config & Security
- Edit `tarot-backend/.env` before production: `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `WEBHOOK_SECRET_KEY`.
- For TLS, extend `deploy/nginx/nginx.conf` with a 443 server block and certs.

Stop & Clean
- docker compose down
- To rebuild after changes: docker compose build && docker compose up -d



## 本地 Docker 迭代与部署（后端更新）

快速流程
- 重建后端镜像：`docker compose build backend`
- 以新镜像重启后端：`docker compose up -d backend`
- 验证
  - 后端健康（直连）：http://localhost:8000/health
  - 通过 Nginx 验证真实 API（示例）：GET http://localhost/api/v1/cards
  - 查看日志：`docker compose logs -f backend`

常见改动与对应命令
- 仅后端代码改动（`tarot-backend/app` 内的 .py）
  - `docker compose build backend && docker compose up -d backend`
- 修改后端依赖（`tarot-backend/requirements.txt`）
  - `docker compose build --no-cache backend && docker compose up -d --force-recreate backend`
- 修改后端环境变量（`tarot-backend/.env`）
  - `docker compose up -d --force-recreate backend`
- 修改后端静态资源（`tarot-backend/static`）
  - 已通过只读挂载映射到容器，刷新页面/重新请求即可生效
- 管理后台代码或配置有改动
  - `docker compose build admin && docker compose up -d admin`
- 大版本/全量重建
  - `docker compose build && docker compose up -d --force-recreate`

数据库（SQLite）持久化与维护
- 持久化：命名卷 `backend_data` 挂载容器路径 `/data/backend_tarot.db`（镜像重建/容器重启不会丢）
- 备份下载：
  - `docker cp $(docker compose ps -q backend):/data/backend_tarot.db ./backend_tarot.db`
- 安全替换（原子）：
  - `docker cp ./backend_tarot.db $(docker compose ps -q backend):/data/backend_tarot.new`
  - `docker exec $(docker compose ps -q backend) sh -lc "sqlite3 /data/backend_tarot.new 'PRAGMA integrity_check;' && mv /data/backend_tarot.db /data/backend_tarot.bak && mv /data/backend_tarot.new /data/backend_tarot.db"`

端口与访问
- 统一入口：Nginx 80 → http://localhost/
- 直连后端调试：http://localhost:8000
- 如 80 被占用：把 compose 里 nginx 的 `ports` 暂改为 `"8080:80"`，访问 `http://localhost:8080/`

可选：更快的本地迭代（热重载）
- 新建 `docker-compose.dev.yml` 覆盖 backend 启动与源码挂载：

```yaml
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./tarot-backend/app:/app/app
      - ./tarot-backend/static:/app/static:ro
```

- 启动（仅后端热重载）：
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend`
- 全套（nginx/admin + 后端热重载）：
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`


阿里云打包部署步骤：
1.打包压缩文件到release目录下，数据库文件直接上传。上传路径/srv/my-tarot。
2.把宿主机的文件 /srv/my-tarot/data/backend_tarot.db 复制到容器内的路径 /data/backend_tarot.db，
  即 替换容器中的数据库文件。
  命令：
  docker cp /srv/my-tarot/data/backend_tarot.db my-tarot-backend-1:/data/backend_tarot.db
  建议先备份容器内原文件：
  docker exec my-tarot-backend-1 cp /data/backend_tarot.db /data/backend_tarot.db.bak

  一键命令：
  docker exec my-tarot-backend-1 sh -c 'ts=$(date +%Y%m%d_%H%M%S); if [ -f /data/backend_tarot.db ]; then cp /data/backend_tarot.db /data/backend_tarot.db.bak_$ts && echo "✅ 已备份为 /data/backend_tarot.db.bak_$ts"; else echo "⚠️ 未找到原数据库文件，跳过备份"; fi' && \
  docker cp /srv/my-tarot/data/backend_tarot.db my-tarot-backend-1:/data/backend_tarot.db && \
  docker exec my-tarot-backend-1 ls -lh /data/backend_tarot.db

  （可选）如果容器中 /bin/bash 存在，你可以用更强一点的版本：
  docker exec my-tarot-backend-1 bash -c 'ts=$(date +%Y%m%d_%H%M%S); if [ -f /data/backend_tarot.db ]; then cp /data/backend_tarot.db /data/backend_tarot.db.bak_$ts && echo "✅ 已备份为 /data/backend_tarot.db.bak_$ts"; else echo "⚠️ 未找到原数据库文件，跳过备份"; fi' && \
  docker cp /srv/my-tarot/data/backend_tarot.db my-tarot-backend-1:/data/backend_tarot.db && \
  docker exec my-tarot-backend-1 ls -lh /data/backend_tarot.db

3.如果改动了后代代码，需要重新构建镜像. 把当前 tarot-backend 目录里的源码打包进去。我们的 docker-compose.yml 只挂载了 /data（数据库卷）和 static 目录，应用代码是在镜像构建时 COPY 进容器的，不会自动与本地文件保持同步。你在仓库里改了 Python 文件，正在运行的容器依然用旧镜像里的代码，所以请求还是走旧逻辑。要让容器加载新代码，必须：
  - 先 docker compose build backend 生成包含最新源码的新镜像；
  - 再 docker compose up -d backend（或 up --build）让容器基于新镜像重建。






