# Mobile UX Insight Engine

This repo contains a Maze product MVP with:

- `backend`: FastAPI ingestion API, storage, processing, and insight generation
- `web`: Next.js product site, dashboard, settings, sign-in, and integration-ready API routes
- `ios-sdk`: Swift Package Manager SDK stub with batching + retry
- `android-sdk`: Kotlin SDK stub with batching + retry

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend exposes:

- `POST /events`
- `GET /health`
- `GET /ready`
- `GET /insights`
- `GET /issues`
- `GET /sessions`

Demo data is seeded only when `SEED_DEMO_DATA=true`. In `APP_ENV=production`, demo seeding defaults to off.

### Web

```bash
cd web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` if needed.

The web app also supports these integration env vars:

- `MAZE_AUTH_SERVICE_URL`
- `MAZE_API_KEYS_SERVICE_URL`
- `MAZE_WORKSPACE_SERVICE_URL`
- `MAZE_INTEGRATIONS_SERVICE_URL`

Internal API routes act as stable integration boundaries:

- `POST /api/auth/signin`
- `GET/POST /api/workspace/api-keys`
- `GET/PUT /api/workspace/settings`
- `GET /api/integrations/status`

## Notes

- The backend blocks SQLite in `APP_ENV=production`; set a real `DATABASE_URL` for deployed environments.
- Copy [backend/.env.example](E:\Maze\backend\.env.example) and [web/.env.example](E:\Maze\web\.env.example) to create local env files.
- The seeded dataset simulates drop-offs, rage taps, dead taps, slow response, and form friction on a fintech onboarding flow.
- The production work plan lives in [PRODUCTION_ROADMAP.md](E:\Maze\PRODUCTION_ROADMAP.md).
