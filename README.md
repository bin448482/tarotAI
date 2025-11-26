# TarotAI Omnichannel Tarot Suite

TarotAI is a full-stack, cross-platform experience that lets anonymous users perform guided tarot readings, save their history, and optionally pay for AI-enhanced interpretations across mobile, web, and admin channels.

## 1. 项目简介 | Description
TarotAI combines an Expo React Native mobile client, a FastAPI backend, and a Next.js admin console to deliver a seamless four-step tarot journey. Anonymous users can draw spreads, receive static card meanings, and upgrade to paid LLM insights (GLM-4 + OpenAI). Admins monitor readings, manage users, vouchers, and dashboards, while AI authoring tools batch-generate narrative content for each card dimension. The system targets reliability (offline-first sync, SQLite persistence), monetization (Stripe Checkout + Google Play IAP compatibility), and operational efficiency through containerized deployment.

## 2. 功能特性 | Features
- 🎴 End-to-end tarot workflow: select reading mode, enter intent (≤200 chars), draw spreads (3-card or Celtic Cross), and view layered interpretations.
- 🤖 Dual-phase AI pipeline: `/readings/analyze` recommends dimensions, `/readings/generate` delivers personalized narratives with optional paid upgrades.
- 🧑‍💻 Modern admin web console: user CRUD, credit adjustments, voucher batches, order source tracking, dashboards, and system health views.
- 💳 Recharge flexibility: Google Play IAP when available, fallback redeem-code top-ups, and Stripe Checkout (API placeholder ready) for global users.
- 🔐 Anonymous yet attributable identity: stable `installation_id`, optional email binding on purchase verification, JWT-based auth across surfaces.
- 📱 Cross-platform delivery: Expo-managed iOS/Android app, responsive web admin, and Dockerized backend/admin/Nginx stack.

## 3. 技术栈 | Tech Stack
- **Languages**: TypeScript (Expo + Next.js), Python (FastAPI), SQL (SQLite), plus scripting in Node.js/Python for tooling.
- **Frameworks**: Expo SDK 54 / React Native 0.81, Expo Router 6, Zustand + SWR on admin, FastAPI 0.104 with SQLAlchemy, Uvicorn, and LLM client abstractions.
- **Databases & Storage**: SQLite per service, Expo SQLite on device, static assets served via FastAPI + CDN-friendly bundles.
- **AI & Payments**: GLM-4 + OpenAI integrations, Stripe Checkout scaffolding, Google Play Billing verification via `/api/v1/payments/google/verify`.
- **Tooling & Ops**: Docker Compose (backend/admin/Nginx), EAS Build for mobile, Tailwind + Ant Design UI, @ant-design/charts for dashboards.

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js 18+ with npm or yarn (Expo + Next.js)
- Python 3.10+ with pip (FastAPI backend & AI generator)
- Docker Desktop / Engine (for containerized deployments)
- Stripe / LLM API keys stored in `tarot-backend/.env`

### 安装步骤 | Setup
```bash
# 1. Clone the mono-repo
git clone <your-git-url> tarotAI
cd tarotAI

# 2. Mobile app (my-tarot-app)
npm ci
npx expo-doctor --verbose
npx expo start -c

# 3. Backend (tarot-backend)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Admin web (tarot-admin-web)
npm ci
npm run dev

# 5. Optional: full stack via Docker
cd ..  # repo root
cp tarot-backend/.env.example tarot-backend/.env  # edit secrets
docker compose up -d --build
```

- Mobile app connects to FastAPI via HTTPS; configure `EXPO_PUBLIC_API_BASE` or equivalent env.
- Admin UI expects `NEXT_PUBLIC_BACKEND_URL` (default `/` behind Nginx proxy).
- SQLite file persists inside Docker volume `backend_data`; use `docker cp` to back up `/data/backend_tarot.db`.
- Before production builds, update icons via `scripts/generate-icons.js` and ensure `assetBundlePatterns` include databases/images.

For a full Chinese walkthrough, see `README_CN.md`.
