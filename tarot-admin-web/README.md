# Tarot Admin Web (Next.js)

Next.js App Router dashboard for operating TarotAI: manage users, vouchers, orders, and download latest client builds.

## 1. 项目简介 | Description
`tarot-admin-web` 基于 Next.js 15 (App Router) + Ant Design 6，提供现代化后台体验。它消费 FastAPI `/admin/*`、`/api/v1/admin-api/*` 接口，展示仪表盘、列表筛选、订单来源，以及 `/client-portal` 页面供团队下载最新移动端构建。

## 2. 功能特性 | Features
- 📊 Dashboard cards & charts via `@ant-design/charts`，实时展示活跃度、订单、兑换码使用。
- 👥 User & credit ops：列表、积分调整、邮箱/安装 ID 检索。
- 🔑 Auth & session：基于 JWT 的管理登录页，SWR hooks 自动刷新。
- 🎫 Voucher + order flows：批量生成兑换码、查看订单来源（Stripe/Play/兑换码）。
- 📱 Client portal：`/client-portal` 托管最新 APK / AAB 下载说明。
- 🧱 Tailwind + Ant Design theme：黑金塔罗风格，可扩展多主题。

## 3. 前端路由 | Frontend Routes
- `/admin/` - 根路由（重定向）
- `/admin/login` - 管理员登录
- `/admin/dashboard` - 仪表板
- `/admin/users` - 用户管理
- `/admin/redeem-codes` - 兑换码管理
- `/admin/orders` - 订单管理
- `/admin/verify-email` - 邮箱验证入口
- `/admin/app-release` - 应用发布管理
- `/admin/client-portal` - 客户端下载门户
- `/admin/privacy` - 隐私政策

为保持移动端与邮件中的既有链接可用，Nginx 还会将公开的 `/verify-email`、`/privacy` 与 `/client-portal` 转发到对应的 `/admin/...` 页面。

## 4. 技术栈 | Tech Stack
- **Language**: TypeScript 5.x
- **Framework**: Next.js 15 App Router, React 19, Ant Design 6
- **State/Data**: Zustand store, SWR data fetching, Zod schema validation
- **Styling**: Tailwind CSS, CSS Modules, Ant Design tokens
- **Others**: ESLint, Prettier, Vercel-ready build scripts, Docker support via root compose

## 5. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js >= 18.18
- npm / pnpm / yarn (示例以 npm)
- Backend URL (`NEXT_PUBLIC_BACKEND_URL`) 指向 FastAPI 反向代理

### 安装步骤 | Setup
```bash
# 1. Install deps
cd tarot-admin-web
npm ci

# 2. Set env
cp .env.example .env.local
# 填写 NEXT_PUBLIC_BACKEND_URL=/api, ADMIN_API_BASE 等

# 3. Start dev server
npm run dev
# 浏览器访问 http://localhost:3000

# 4. Build & start prod preview
npm run build
npm run start
```

- Client portal 访问：`http://localhost:3000/admin/client-portal`；线上环境请替换域名。
- When running via Docker Compose, admin listens on port 3000 and is proxied by Nginx (`/` → admin, `/api/*` → backend).
- Deploy to Vercel or any Node hosting; ensure environment variables mirror production backend routes.

中文说明可参考根目录 `README_CN.md`。
