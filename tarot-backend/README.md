# Tarot Backend (FastAPI)

FastAPI service powering anonymous tarot users, dual-phase AI readings, payments, and the admin portal.

## 1. 项目简介 | Description
`tarot-backend` 采用单体 FastAPI + SQLite 架构，提供 `/api/v1/*` 客户端接口、管理员 API、静态资源与 LLM 网关。它支持匿名安装 ID + JWT 认证、GLM-4 / OpenAI 双引擎解读、Google Play / 兑换码充值，未来扩展 Stripe Checkout。后端同样为 Next.js 管理后台提供用户、兑换码、订单、仪表盘等数据。

## 2. 功能特性 | Features
- 🔐 Anonymous auth: `/api/v1/users/register` 返回稳定 `installation_id`，JWT 保护后续请求。
- 🤖 Two-step readings: `/readings/analyze` 推荐维度，`/readings/generate` 产出多语言 LLM 结果。
- 💳 Payments & credits: 兑换码、Google Play 校验端点 (`/payments/google/verify`)，Stripe Checkout 预留。
- 🧑‍💻 Admin APIs: 用户、积分、兑换码、订单、仪表盘、系统监控等 REST 端点。
- 🗂️ Static assets & DB: `static/` 下卡牌图片，SQLite `backend_tarot.db` 通过 Docker volume 持久化。

## 3. 技术栈 | Tech Stack
- **Language**: Python 3.10+
- **Framework**: FastAPI 0.104, Uvicorn, SQLAlchemy ORM, Pydantic
- **Database**: SQLite (可替换 Postgres)，Alembic migrations
- **AI**: Custom LLM router for GLM-4, OpenAI, future providers
- **Others**: JWT (PyJWT), Stripe/Google Play SDKs, Docker Compose, Nginx reverse proxy

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Python >= 3.10
- SQLite3 CLI (可选)
- `tarot-backend/.env` with JWT/LLM/payment secrets
- Docker (可选，用于一键部署)

### 安装步骤 | Setup
```bash
# 1. Install deps
cd tarot-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Configure env
cp .env.example .env  # 填写 ADMIN_PASSWORD, JWT_SECRET_KEY, LLM keys

# 3. Run migrations / init DB
alembic upgrade head  # 若使用 Alembic；或保持 SQLite 预置文件

# 4. Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Docs & health
open http://localhost:8000/docs
curl http://localhost:8000/health
```

- Docker: 在仓库根目录执行 `docker compose up -d backend`，静态资源挂载到容器 `/app/static`，数据库保存在卷 `backend_data:/data/backend_tarot.db`。
- 管理后台（Next.js）通过 Nginx `/api/` 路由访问本服务的 `/api/v1/*`。
- Google Play 校验端点需携带 `installation_id`，可选 `email` 用于绑定。

更多架构细节请查阅 `CLAUDE.md`。
