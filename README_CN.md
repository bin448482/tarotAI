# TarotAI 全渠道塔罗系统

TarotAI 是一个跨平台全栈方案，匿名用户即可完成完整的塔罗占卜流程，保存历史记录，并选择升级为 AI 深度解读；同一套后端同时驱动移动端、Web 管理台以及内容生成工具。

## 1. 项目简介
TarotAI 由 Expo React Native 客户端、FastAPI 后端与 Next.js 管理后台组成，围绕四步骤占卜体验展开：选择模式 → 填写诉求 → 抽牌 → 查看结果。系统内置静态牌义，同时通过智谱 GLM-4 与 OpenAI 组合的 LLM 流程生成个性化解读。管理后台可查看用户、订单、兑换码和仪表盘数据，而 AI 生成器可批量产出卡牌维度解读，满足持续运营需求。

## 2. 功能特性
- 🎴 完整占卜流程：支持基础解读与 AI 解读，卡组包含三牌阵、凯尔特十字等主流牌阵。
- 🤖 双阶段 AI：`/readings/analyze` 输出推荐维度，`/readings/generate` 生成多维度文案，支持付费解锁。
- 🧑‍💻 现代化管理后台：包含用户管理、积分调整、兑换码批量生成、订单来源展示与实时仪表盘。
- 💳 多渠道充值：优先检测 Google Play IAP，可回落到兑换码/Stripe Checkout，兼顾离线与境外用户。
- 🔐 匿名身份体系：`installation_id` 作为稳定主键，可在支付校验时绑定邮箱，统一用 JWT 做访问控制。
- 📱 跨端交付：Expo RN 覆盖 iOS/Android，Next.js 提供响应式后台，Docker Compose 统一编排后台 + Nginx。

## 3. 技术栈
- **语言**：TypeScript（Expo / Next.js）、Python（FastAPI、生成工具）、SQL（SQLite）。
- **框架**：Expo SDK 54、React Native 0.81、Expo Router 6、Zustand + SWR、FastAPI 0.104、SQLAlchemy、Uvicorn。
- **数据与存储**：客户端 SQLite（Expo SQLite）、后端独立 SQLite、静态资源由 FastAPI 提供并可挂 CDN。
- **AI 与支付**：智谱 GLM-4、OpenAI、Stripe Checkout（开发中）、Google Play Billing `/api/v1/payments/google/verify`。
- **工具与运维**：Docker Compose（backend/admin/Nginx）、EAS Build、Tailwind + Ant Design、@ant-design/charts。

## 4. 安装与运行
### 环境要求
- Node.js 18 及以上，支持 npm/yarn（移动端与管理后台）
- Python 3.10 及以上（FastAPI 后端与 AI 生成工具）
- Docker Desktop / Engine（生产或一键演示部署）
- 已配置的 LLM/Stripe 等环境变量写入 `tarot-backend/.env`

### 安装步骤
```bash
# 克隆项目
git clone <your-git-url> tarotAI
cd tarotAI

# 移动端 my-tarot-app
cd my-tarot-app
npm ci
npx expo-doctor --verbose
npx expo start -c

# 后端 tarot-backend
cd ../tarot-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 管理后台 tarot-admin-web
cd ../tarot-admin-web
npm ci
npm run dev

# Docker 一键启动（可选）
cd ..
cp tarot-backend/.env.example tarot-backend/.env  # 填写密钥
docker compose up -d --build
```

- Expo 客户端通过 HTTPS 访问 FastAPI，需要设置 `EXPO_PUBLIC_API_BASE` 等环境变量。
- 管理后台依赖 `NEXT_PUBLIC_BACKEND_URL`（默认由 Nginx 反代至 `/api/`）。
- Docker 部署下，SQLite 保留在卷 `backend_data` 的 `/data/backend_tarot.db`；可用 `docker cp` 备份。
- 发布前可运行 `scripts/generate-icons.js`、`scripts/generate-ios-appicon.js` 更新图标，并确认 `assetBundlePatterns` 已包含图片与数据库。

英文版请参阅 `README.md`。
