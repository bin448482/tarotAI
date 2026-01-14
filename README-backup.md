# TarotAI Omnichannel Tarot Suite

TarotAI is a full-stack, cross-platform tarot experience: anonymous users can complete a guided 4-step reading flow, keep history, and optionally unlock AI-enhanced interpretations across mobile, web, and admin channels.

## 1. 项目简介 | Description
TarotAI combines:
- `my-tarot-app/`: Expo React Native client (iOS/Android)
- `tarot-backend/`: FastAPI backend (SQLite + static assets + LLM integrations)
- `tarot-admin-web/`: Next.js admin console (Ant Design)
- `tarot-ai-generator/`: Python generator for batch tarot content

## 2. 功能特性 | Features
- End-to-end tarot flow: mode → intent → draw → interpretation.
- Two-step AI flow: `POST /api/v1/readings/analyze` → `POST /api/v1/readings/generate`.
- Anonymous identity: stable `installation_id` + JWT auth; optional email binding on purchase verification.
- Admin console: user/credits, redeem codes, purchases, dashboards and monitoring.
- Deployments: Docker Compose with `nginx` reverse proxy; SQLite persistence via volume.

## 3. 技术栈 | Tech Stack
- **Languages**: TypeScript (Expo + Next.js), Python (FastAPI), SQL (SQLite), plus scripting in Node.js/Python for tooling.
- **Frameworks**: Expo SDK 54 / React Native 0.81, Expo Router 6, Zustand + SWR on admin, FastAPI 0.104 with SQLAlchemy, Uvicorn, and LLM client abstractions.
- **Databases & Storage**: SQLite per service, Expo SQLite on device, static assets served via FastAPI + CDN-friendly bundles.
- **AI & Payments**: GLM-4 + OpenAI integrations; Stripe Checkout scaffold; Google Play Billing verification via `POST /api/v1/payments/google/verify`.
- **Tooling & Ops**: Docker Compose (backend/admin/nginx), EAS Build for mobile, Tailwind + Ant Design UI, @ant-design/charts for dashboards.

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js 18+ with npm or yarn (Expo + Next.js)
- Python 3.10+ with pip (FastAPI backend & AI generator)
- Docker Desktop / Engine (for containerized deployments)
- Stripe / LLM API keys stored in `tarot-backend/.env` (for Docker and local backend)

### 推荐：Docker 一键启动 | Quickstart (Docker)
```bash
# Clone
git clone <your-git-url> tarotAI
cd tarotAI

# Configure backend env
cp tarot-backend/.env.example tarot-backend/.env
# edit `tarot-backend/.env` (JWT_SECRET_KEY, ADMIN_PASSWORD, etc.)

# Start stack (nginx + admin + backend)
docker compose up -d --build
```

Notes:
- Default ports: `http://localhost/` (nginx), backend debug `http://localhost:8001/health` (mapped from container `8000`).
- Backend Swagger UI is on the backend itself: `http://localhost:8001/docs` (nginx routes `/` to admin by default).
- SQLite persists in Docker volume `backend_data` at `/data/backend_tarot.db` in the backend container.
- If you don’t have Google Play service account credentials locally, create `deploy/secrets/google-service-account.json` or remove that bind mount from `docker-compose.yml`.
- Docker variants:
  - Dev hot-reload backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
  - Production example: `docker compose -f docker-compose.prod.yml up -d --build` (expects `env/backend.env`)

### 本地开发（不使用 Docker） | Local Dev (No Docker)
```bash
# Backend
cd tarot-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit secrets
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Admin web (new terminal)
cd tarot-admin-web
npm ci
npm run dev

# Mobile app (new terminal)
cd my-tarot-app
npm ci
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:8000 npx expo start -c
```

For a full Chinese walkthrough, see `README_CN.md`.

