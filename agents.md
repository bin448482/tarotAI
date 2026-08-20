# 塔罗牌应用全栈开发指南 (CLAUDE.md)

## 📱 项目概述

**塔罗牌应用** 是一个全栈的跨平台塔罗牌应用，采用 Expo React Native + FastAPI + Next.js 架构，提供塔罗牌抽牌、解读和付费AI解读服务，以及现代化的Web管理后台。

### 核心功能
- 匿名用户支持（无需注册）
- 神秘塔罗风格首页设计
- 完整占卜流程（4个步骤）
- 静态基础解读 + 付费LLM动态解读
- 完整的占卜历史记录功能
- 离线同步机制
- 跨平台支持（Android/iOS）
- 现代化Web管理后台系统

## 🏗️ 整体架构

```
[Expo RN 客户端 (my-tarot-app/)]
    ├── 首页 (神秘塔罗风格)
    ├── 占卜流程 (4步骤)
    ├── 历史记录
    ├── 卡牌说明
    └── 系统说明
    ↓ HTTPS
[FastAPI 后端 (tarot-backend/)]
    ├── 卡牌/牌阵/解读 API (✅ 已实现)
    ├── LLM 调用 (智谱AI + OpenAI) (✅ 已实现)
    ├── JWT 匿名认证 (✅ 已实现)
    ├── 支付 (Stripe Checkout) (🔄 待实现)
    ├── SQLite 独立数据库
    └── 静态资源 (卡牌图片)
    ↓ Web管理后台
[Next.js Web管理后台 (tarot-admin-web/)]
    ├── 用户管理 (✅ 已实现)
    ├── 兑换码管理 (✅ 已实现)
    ├── 订单管理 (✅ 首版：列表/筛选/订单来源展示)
    ├── 数据仪表板 (✅ 已实现)
    └── 系统监控 (✅ 已实现)
    ↑ 数据生成
[AI生成工具 (tarot-ai-generator/)]
    ├── 维度解读生成 (✅ 已实现)
    ├── 批量内容生成 (✅ 已实现)
    └── 智谱AI集成 (✅ 已实现)
```

## 🛠️ 技术栈总览

### 前端 (my-tarot-app/)
- **框架**: Expo React Native ~54.0.1
- **语言**: TypeScript ~5.9.2
- **导航**: Expo Router ~6.0.0 + React Navigation 7.x
- **本地数据库**: SQLite (Expo SQLite)
- **构建**: EAS Build

### 后端 (tarot-backend/)
- **框架**: FastAPI ~0.104.0 (✅ 已实现)
- **数据库**: SQLite (独立数据库文件)
- **LLM集成**: 智谱AI + OpenAI API (✅ 已实现)
- **认证**: JWT 匿名用户系统 (✅ 已实现)
- **API设计**: 分两步解读流程 (✅ 已实现)
- **支付**: Stripe Checkout (🔄 待集成)
- **部署**: 单体服务器 + Nginx

### Web管理后台 (tarot-admin-web/)
- **框架**: Next.js ~15.5.4 (App Router)
- **语言**: TypeScript ~5.0
- **UI库**: Ant Design ~6.x
- **图表**: @ant-design/charts ~2.6
- **状态管理**: Zustand ~5.0
- **数据获取**: SWR ~2.3
- **样式**: Tailwind CSS + Ant Design

### 开发工具 (tarot-ai-generator/)
- **功能**: AI解读内容生成工具 (✅ 已实现)
- **语言**: Python
- **AI服务**: 智谱AI (glm-4)
- **用途**: 批量生成塔罗牌维度解读内容

## 📁 项目结构

```
MySixth/
├── .docs/                           # 项目文档
├── my-tarot-app/                    # 前端应用 (Expo React Native)
│   ├── app/                         # 页面路由
│   ├── components/                  # 组件库
│   ├── lib/                         # 核心业务逻辑
│   └── CLAUDE.md                    # 前端开发指南
├── tarot-backend/                   # 后端应用 (FastAPI)
│   ├── app/                         # 应用代码
│   ├── static/                      # 静态资源
│   └── CLAUDE.md                    # 后端开发指南
├── tarot-admin-web/                 # Web管理后台 (Next.js)
│   ├── src/                         # 源代码
│   │   ├── app/                     # 页面路由
│   │   ├── components/              # 组件库
│   │   ├── lib/                     # API客户端
│   │   └── types/                   # TypeScript类型
│   └── CLAUDE.md                    # Web管理后台开发指南
├── tarot-ai-generator/              # AI解读生成工具 (Python)
│   ├── main.py                      # 主程序
│   ├── config.py                    # 配置管理
│   └── CLAUDE.md                    # 工具使用指南
└── CLAUDE.md                        # 本文档
```

## 🔌 API 设计概览

### 核心接口

| 方法   | 路径                   | 说明                    | 状态 |
| ---- | -------------------- | --------------------- | --- |
| POST | `/api/v1/users/register`   | 生成匿名用户ID              | ✅ 已实现 |
| GET  | `/cards`       | 获取卡牌列表                | ✅ 已实现 |
| GET  | `/dimensions`  | 获取维度列表                | ✅ 已实现 |
| GET  | `/spreads`     | 获取牌阵列表                | ✅ 已实现 |
| POST | `/readings/analyze` | 第一步：分析用户描述，返回推荐维度 | ✅ 已实现 |
| POST | `/readings/generate` | 第二步：基于选定维度生成多维度解读 | ✅ 已实现 |
| POST | `/payments/checkout` | 创建 Stripe Checkout 会话 | 🔄 待实现 |

### 管理后台接口

| 方法   | 路径                   | 说明                    | 状态 |
| ---- | -------------------- | --------------------- | --- |
| POST | `/admin/login`       | 管理员登录                | ✅ 已实现 |
| GET  | `/admin/users`       | 获取用户列表               | ✅ 已实现 |
| PUT  | `/admin/users/{id}/credits` | 调整用户积分         | ✅ 已实现 |
| GET  | `/admin/redeem-codes` | 获取兑换码列表            | ✅ 已实现 |
| POST | `/admin/redeem-codes/generate` | 批量生成兑换码     | ✅ 已实现 |
| GET  | `/admin/dashboard/metrics` | 获取仪表板统计数据    | ✅ 已实现 |

### 解读API流程

**分两步解读设计**：
1. **分析阶段** (`/readings/analyze`)：用户输入描述 → LLM分析 → 返回推荐维度
2. **生成阶段** (`/readings/generate`)：选择维度和卡牌 → LLM生成 → 返回详细解读

## 📋 占卜流程设计

### 4步骤占卜流程
1. **步骤1**: 选择占卜类型（基础解读/AI解读）
2. **步骤2**: 输入占卜描述（200字以内）
3. **步骤3**: 抽取塔罗牌（支持三牌阵/凯尔特十字）
4. **步骤4**: 查看解读结果（基础牌意/AI详细解读）

## 🎯 开发优先级

### ✅ 已完成阶段 - 核心架构
1. ✅ FastAPI后端框架搭建
2. ✅ 数据库设计和SQLAlchemy模型
3. ✅ 核心API接口实现（认证、卡牌、维度、牌阵）
4. ✅ LLM集成服务（智谱AI + OpenAI双支持）
5. ✅ 分两步解读API流程实现
6. ✅ Next.js Web管理后台开发完成

### 🔄 当前优先级 - 前端开发
1. **第一阶段**: 首页设计与组件架构
2. **第二阶段**: 占卜流程开发（4步骤，与后端API集成）
3. **第三阶段**: 历史记录功能
4. **第四阶段**: 支付集成与优化

### 🔄 待实现功能
- Stripe支付集成（后端）
- 离线同步机制
- 部署和监控

## 📚 详细开发指南

### 分支特定文档
- **前端开发**: 参考 `my-tarot-app/CLAUDE.md`
  - 组件架构设计
  - 数据库管理策略
  - AI占卜功能架构
  - 卡牌说明功能架构

- **后端开发**: 参考 `tarot-backend/CLAUDE.md`
  - FastAPI架构设计
  - 数据库表结构详情
  - LLM集成架构
  - API接口实现细节

- **Web管理后台**: 参考 `tarot-admin-web/CLAUDE.md`
  - Next.js + Ant Design架构设计
  - 管理后台功能实现
  - API集成和认证系统
  - 现代化Web体验设计

- **AI工具使用**: 参考 `tarot-ai-generator/CLAUDE.md`
  - 维度解读生成工具
  - 批量内容生成策略
  - 成本控制和质量优化

### 组件特定文档
- **首页组件**: `my-tarot-app/components/home/CLAUDE.md`
- **占卜组件**: `my-tarot-app/components/reading/CLAUDE.md`
- **通用组件**: `my-tarot-app/components/common/CLAUDE.md`

## 💡 开发指导原则

### 对 Claude 的指导
1. **前端优先**: 当前重点实现前端占卜流程和后端API集成
2. **组件化开发**: 严格按照组件库架构开发，保持代码复用性
3. **API集成**: 优先实现与已完成后端API的集成
4. **架构一致性**: 严格按照架构文档的设计模式开发
5. **类型安全**: 前后端都要确保类型定义正确
6. **管理后台**: 现代化Web管理后台已完成，支持用户管理、兑换码管理等功能

### 技术要求
- **前端**: 遵循 React Native 和 TypeScript 最佳实践
- **后端**: 遵循 FastAPI 和 Python 最佳实践
- **Web管理后台**: 遵循 Next.js 和 Ant Design 最佳实践
- **数据库**: 保持数据一致性和完整性
- **API**: RESTful 设计，清晰的错误处理

## 🧭 充值通道与身份策略（重要）

- 通道选择（客户端侧逻辑）
  - 若检测到 `react-native-iap` 可用且设备支持 Google Play：展示并走 Google Play IAP；否则仅展示“兑换码充值”通道。
  - 地区判断（SIM/Locale/IP）仅作参考，不作为强依赖，最终以 IAP 可用性为准。

- 用户身份兼容
  - 主键标识：统一以 `installation_id` 作为匿名用户稳定标识（必传）。
  - 邮箱绑定：若客户端已获得用户邮箱（用户设置中填写/授权），在 Play 购买校验时随请求一并上送；后端校验成功后写入/更新 `users.email`。无邮箱不阻断流程。
  - 对中国大陆/离线用户：无 Play 服务时，默认走“兑换码充值”，不影响现有匿名用户路径。

- 后端接口约定
  - `POST /api/v1/payments/google/verify` 接受 `installation_id`（必填）与 `email`（可选）；校验成功后创建/查找用户并进行邮箱绑定。
  - `Purchase.product_id` 首版建议存“积分数”（5/10/20/50/100），与兑换码一致。

---

*此文档用于指导塔罗牌应用全栈开发工作，详细的前后端开发指南请参考各自目录下的 CLAUDE.md 文件。*
## Docker Architecture (Backend/Admin/Nginx)

- Services
  - backend: FastAPI + Uvicorn on 8000; mounts `./tarot-backend/static` read-only to `/app/static`; persistent volume `backend_data:/data` for SQLite `backend_tarot.db`.
  - admin: Next.js (production) on 3000; `NEXT_PUBLIC_BACKEND_URL=/` baked into build.
- nginx: listens on 80/443; serves the static personal Portal at `/`, routes `/admin/*` to the Next.js admin app, and routes `/api/*` to backend.
- Ports
  - host 80 -> nginx 80; host 8000 -> backend 8000 (for direct API/health debug).
- Env & Secrets
  - `tarot-backend/.env` is loaded by the backend container. Change `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `WEBHOOK_SECRET_KEY` before production.
- Health & Routing
  - backend health: `GET /health` (direct on 8000). When via nginx, use real API under `/api/v1/*`; note `/api/health` is not defined.
- Build & Run
  - `docker compose build`
  - `docker compose up -d`
  - `docker compose ps` / `docker compose logs <service>`
- DB Persistence & Manual Copy
  - path inside container: `/data/backend_tarot.db` (volume `backend_data`).
  - download: `docker cp backend:/data/backend_tarot.db ./backend_tarot.db`
  - safe replace:
    - `docker cp ./backend_tarot.db backend:/data/backend_tarot.new`
    - `docker exec backend sh -lc "sqlite3 /data/backend_tarot.new 'PRAGMA integrity_check;' && mv /data/backend_tarot.db /data/backend_tarot.bak && mv /data/backend_tarot.new /data/backend_tarot.db'"`
- Optional TLS
  - Add 443 server block and certs to `deploy/nginx/nginx.conf` for production.

## Portfolio Publication Boundary

- `miidea.top` serves only the reviewed static allowlist generated from the separate `public-portfolio` checkout. The source checkout is never mounted as a web root.
- `release/publish_portfolio.py` validates the allowlist, approved contact data, secrets and local-path markers before atomically replacing `deploy/portal`; run its `--check` mode before each publication. The server procedure and route ownership are in `release/PUBLISH_PORTFOLIO.md`.
- Nginx serves an existing static asset first and falls back to the admin app only when the asset is absent. Keep `/admin/*`, `/api/*`, `/static/*`, `/health`, ACME and compatibility locations explicit when changing routes.

## Release Packaging Notes

- When creating deployment archives on Windows, use a Python `zipfile` script (or another tool that normalizes paths) so entries always contain POSIX `/` separators; otherwise Linux `unzip` may stop, waiting for overwrite confirmation because of `\` paths.
- Before compressing, remove transient folders such as `.next`, `node_modules`, `venv`, logs, and `__pycache__` to keep the bundle minimal.
- Include `docker-compose.prod.yml` in internal ECS release bundles; do not include it in the public sanitized branch.
- Exclude `tarot-backend/backend_tarot.db` from release bundles; keep production data in the Docker volume.
- On the target server, clean any previous extraction (for example `rm -rf /srv/my-tarot/MySixth-docker-20251010`) before running `unzip -o MySixth-docker-20251010.zip -d /srv/my-tarot` to avoid the non-interactive overwrite issue.


## Public Sanitized Branch

- 当前公开发布分支是 orphan/root 分支 `public-sanitized`，当前 root commit 为 `386d1a7 Initial sanitized public release`。
- `git rev-list --parents -n 1 public-sanitized` 只应显示一个 commit hash，没有 parent；如出现 parent，说明不是干净 orphan 分支。
- 主开发分支当前为 `biiinnn20251126`，主工作树位置为 `D:\0-development\projects\tarotAI`。不要为了维护公开发布分支而把主开发分支混入历史或误推包含原历史的分支。
- `public-sanitized` 采用保守排除策略：
  - 包含：应用代码、后端代码、管理后台代码、AI 生成工具代码、公开 README/agents 文档、示例配置、Docker dev/default 配置、静态资源和公开样例数据。
  - 不包含：`docker-compose.prod.yml`、`.env`/`.env.*`、数据库文件、构建产物、debug/release 包、本地工具配置、cookies、真实服务账号文件、Android/iOS keystore 和证书私钥。
- 推送公开分支时从本仓库确认当前分支或显式指定 ref：
  ```powershell
  cd D:\0-development\projects\tarotAI
  git push origin public-sanitized
  ```
- 公开 GitHub repository 时只展示或发布 `public-sanitized` 分支；不要把包含原历史的 `biiinnn20251126` 或 `main` 一起公开。
- 每次更新 `public-sanitized` 前必须重新扫描真实域名、内网 IP、个人邮箱、EAS projectId、默认密码、JWT/webhook/admin secret、Google service account 私钥、OpenAI/智谱/代理 API key、keystore/证书、生产路径和本地配置文件。example API key 占位符可以保留，但真实 key 一律不能进入分支。
- 建议公开前至少运行：
  ```powershell
  git grep -n -E 'miidea\.top|192\.168\.|admin123|76626123@qq\.com|biiinnn001@gmail\.com|support@mysixth\.app|0d19ed54-5efd-4fe1-ae51-23a1b6602215|your-secret-key-change-in-production|your-secure-admin-password|your-webhook-secret|BEGIN PRIVATE KEY|PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}' HEAD -- .
  git ls-tree -r --name-only HEAD | rg '(^|/)(docker-compose\.prod\.yml|settings\.local\.json|cookies\.txt|mcp\.json|.*\.env|.*\.jks|.*\.keystore)$'
  ```
