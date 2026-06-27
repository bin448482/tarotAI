# TarotAI

[![GitHub](https://img.shields.io/badge/GitHub-bin448482%2FtarotAI-blue?logo=github)](https://github.com/bin448482/tarotAI)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev/)
[![React%20Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

English README · 中文说明请看 `README_CN.md`

## Overview
TarotAI is a full-stack, cross-platform tarot suite:

- **Mobile (Expo RN)**: mystical home + guided 4-step reading flow + history + optional paid AI interpretations

- **Backend (FastAPI)**: anonymous auth, cards/spreads/dimensions APIs, dual-phase LLM readings,
  credits/payments scaffolding

- **Admin (Next.js)**: user/credits, redeem codes, orders, dashboards & monitoring

## Features
- Guided 4-step reading flow (mode → intent → draw → interpretation)
- Two-step AI flow: `POST /api/v1/readings/analyze` → `POST /api/v1/readings/generate`
- Anonymous identity: stable `installation_id` + JWT; optional email binding on purchase verification
- Docker Compose deployment: `nginx` reverse proxy + persistent SQLite volume

## Architecture
~~~text
Expo RN (my-tarot-app/)
  └─ HTTPS
FastAPI (tarot-backend/)  ── serves /api/* and /static/*
  └─ used by
Next.js Admin (tarot-admin-web/)
~~~

## Getting Started
### Quickstart (Docker)
~~~bash
git clone https://github.com/bin448482/tarotAI.git
cd tarotAI

cp tarot-backend/.env.example tarot-backend/.env
  # edit tarot-backend/.env (JWT_SECRET_KEY, ADMIN_PASSWORD, LLM keys, etc.)

docker compose up -d --build
~~~

Endpoints:

- Admin (via nginx): `http://localhost/`
- Backend health (via nginx): `http://localhost/health`
- Backend debug port (host → backend): `http://localhost:8001/health`
- Backend Swagger (debug port): `http://localhost:8001/docs`

Notes:

- If you don’t have a Google Play service account file locally, either create
  `deploy/secrets/google-service-account.json` or remove that bind mount in `docker-compose.yml`.

- Variants:
  - Dev hot-reload backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
  - Production example: `docker compose -f docker-compose.prod.yml up -d --build` (expects `env/backend.env`)

### Local Development (No Docker)
#### Backend (FastAPI)
~~~bash
cd tarot-backend
python -m venv .venv
~~~

macOS/Linux:
~~~bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
~~~

Windows (PowerShell):
~~~powershell
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
~~~

#### Admin (Next.js)
~~~bash
cd tarot-admin-web
npm ci
npm run dev
~~~

#### Mobile (Expo)
~~~bash
cd my-tarot-app
npm ci
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:8000 npx expo start -c
~~~

## Repository Structure

- `my-tarot-app/` - Expo React Native client (`my-tarot-app/README.md`)
- `tarot-backend/` - FastAPI backend (`tarot-backend/README.md`)
- `tarot-admin-web/` - Next.js admin dashboard (`tarot-admin-web/README.md`)
- `tarot-ai-generator/` - Python content generator (`tarot-ai-generator/README.md`)
- `deploy/` - nginx config + certbot assets

## API Notes
- Public API base: `/api/v1/*` (served under nginx `/api/` → backend)
- Health: `GET /health`
- Static assets: `/static/*` (cards/images/app releases)

## Contributing
1. Fork the repo
2. Create a branch (`git checkout -b feature/my-change`)
3. Commit (`git commit -m "..."`)
4. Push (`git push origin feature/my-change`)
5. Open a Pull Request

## License
No license file is present in this repository.
If you plan to publish or distribute this project, add a `LICENSE` and update this section.

## Contact
- GitHub Issues: [bin448482/tarotAI/issues](https://github.com/bin448482/tarotAI/issues)
