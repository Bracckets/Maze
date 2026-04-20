# Mobile UX Insight Engine

This repo now runs against PostgreSQL and includes:

- `backend`: FastAPI auth, workspace management, API keys, ingestion, issues, insights, and heatmaps
- `web`: Next.js marketing site plus sign up, sign in, dashboard, settings, profile, and heatmap views
- `ios-sdk`: Swift Pollex SDK that batches authenticated event uploads
- `android-sdk`: Kotlin Pollex SDK that batches authenticated event uploads
- `web-sdk`: TypeScript Pollex SDK for browser telemetry and Liquid runtime resolution

## What Changed

- Mock auth and mock API-key flows were removed from the active app path.
- SQLite and demo seeding are no longer part of the main runtime path.
- The backend expects your PostgreSQL schema to already exist.
- The SDKs now send production-shaped payloads with `event_id`, `session_id`, `device_id`, `occurred_at`, and `X-API-Key`.

## Local Env Files

These files are already created for local use:

- [backend/.env](E:/Maze/backend/.env)
- [web/.env](E:/Maze/web/.env)

Before starting the app, edit [backend/.env](E:/Maze/backend/.env) and replace:

- the PostgreSQL password in `DATABASE_URL` for user `postgres`

Default local values currently assume:

- PostgreSQL host: `127.0.0.1`
- PostgreSQL port: `5432`
- PostgreSQL database: `Maze`
- Backend URL: `http://127.0.0.1:8000`
- Web URL: `http://127.0.0.1:3000`

If you want phones or other machines on your LAN to reach the backend, change:

- `PUBLIC_API_BASE_URL` in [backend/.env](E:/Maze/backend/.env)
- `NEXT_PUBLIC_API_BASE_URL` in [web/.env](E:/Maze/web/.env)
- `MAZE_BACKEND_URL` in [web/.env](E:/Maze/web/.env)

from `127.0.0.1` to your machine's reachable IP.

## Required Database Schema

The backend assumes your PostgreSQL schema already exists, including:

- `users`
- `workspaces`
- `plans`
- `subscriptions`
- `api_keys`
- `sessions`
- `events`
- `event_dedup`
- `usage_daily`
- `usage_monthly`
- `api_key_usage_daily`
- `ingestion_logs`
- `issues`
- `insights`
- `billing_cycles`

Use [backend/maze.sql](E:/Maze/backend/maze.sql) as the source of truth for schema setup.
On boot, the backend also applies safe runtime upgrades for production persistence:

- creates `workspace_settings` if it is missing
- adds `events.metadata`
- adds `api_keys.environment` and `api_keys.key_prefix`
- expands `issues` and `insights` for persisted snapshots

## Run Order

### 1. Start PostgreSQL

Make sure your PostgreSQL server is running and the `Maze` database has been initialized with [backend/maze.sql](E:/Maze/backend/maze.sql).

### 2. Start the backend

```bash
cd E:\Maze\backend
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend endpoints:

- `POST /auth/signup`
- `POST /auth/signin`
- `GET /auth/me`
- `GET /workspace/settings`
- `PUT /workspace/settings`
- `GET /workspace/api-keys`
- `POST /workspace/api-keys`
- `POST /events`
- `GET /insights`
- `GET /issues`
- `GET /sessions`
- `GET /heatmap?screen=<screen>`
- `GET /heatmap/scenario`
- `GET /integrations/status`
- `GET /health`
- `GET /ready`

### 3. Start the web app

```bash
cd E:\Maze\web
npm install
npm run dev
```

Open:

- `http://127.0.0.1:3000`

### 4. Create your first workspace

Go to:

- `http://127.0.0.1:3000/signup`

Create an account and workspace. The app will sign you in automatically.

### 5. Generate an API key

After sign-in:

- open `Settings`
- generate a `Live` or `Test` API key
- copy the key when it is shown

That key is what the iOS and Android SDKs send as `X-API-Key`.

### 6. Save SDK settings

In `Settings`, you can also persist:

- ingestion endpoint
- auth provider label
- ingestion mode
- masking rules

The masking rule is now applied during event ingestion before metadata is stored in PostgreSQL.

## SDK Configuration

### Android

Configure with:

```kotlin
Pollex.configure(
    PollexConfig(
        apiKey = "mz_live_...",
        deviceId = "android-device-001",
        endpoint = "http://10.0.2.2:8000/events",
        appVersion = "1.0.0",
        sessionCaptureEnabled = false
    )
)
```

Notes:

- Android emulator should use `10.0.2.2` to reach a backend running on your development machine.
- Physical devices should use your machine's reachable LAN IP instead.

### iOS

Configure with:

```swift
Pollex.configure(
    PollexConfig(
        apiKey: "mz_live_...",
        deviceId: "ios-device-001",
        endpoint: URL(string: "http://127.0.0.1:8000/events")!,
        appVersion: "1.0.0",
        sessionCaptureEnabled: false
    )
)
```

For a simulator or physical device, replace `127.0.0.1` with a reachable host when needed.

## Verification Status

The codebase has been sanity-checked with:

- backend `python -m compileall app`
- web `npx tsc --noEmit`

A full `next build` may fail if an existing local dev process is still holding files inside `web/.next`.

## Persisted Production Features

The production path now persists:

- workspace settings in `workspace_settings`
- event metadata in `events.metadata`
- API-key environment and prefix in `api_keys`
- issue snapshots in `issues`
- structured insight payloads in `insights`

One schema addition is still worth considering if you need deeper product analytics:

- add a nullable authenticated user identifier to `sessions` if you want analytics by signed-in end user instead of only by `device_id`
