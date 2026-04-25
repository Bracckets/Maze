# Pollex

Pollex is adaptive UI infrastructure powered by Tactus, an engine that learns from user behavior and safely adapts interfaces inside your design system.

Phase 1 lives in [pollex/apps/api](E:/Maze/pollex/apps/api) and implements the backend Tactus Engine only.
Phase 2 lives in [pollex/packages](E:/Maze/pollex/packages) and implements the TypeScript SDK packages.
Phase 3 lives in [pollex/apps/studio](E:/Maze/pollex/apps/studio) and implements Pollex Studio.
Phase 4 lives in [pollex/apps/demo](E:/Maze/pollex/apps/demo) and implements the adaptive UI demo plus production hardening.

## Run The API

```bash
cd E:\Maze\pollex\apps\api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/pollex
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Run Tests

```bash
cd E:\Maze\pollex\apps\api
python -m pytest tests

cd E:\Maze\pollex
npm test
python -m pytest apps\api\tests tests\e2e
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection URL used by the API and Alembic.
- `APP_NAME`: optional FastAPI title.
- `ENVIRONMENT`: optional local environment label.

## SDK Packages

- `@pollex/shared-types`
- `@pollex/sdk-js`
- `@pollex/sdk-react`

Build and typecheck:

```bash
cd E:\Maze\pollex
npm run typecheck
npm run build
```

## Run Studio

```bash
cd E:\Maze\pollex\apps\studio
npm run dev
```

Open `http://127.0.0.1:5173/login`.

## Run Demo

```bash
cd E:\Maze\pollex\apps\demo
npm run dev
```

Open `http://127.0.0.1:5174`.

## SDK Endpoints

All SDK endpoints require `Authorization: Bearer <api-key>`.

- `POST /sdk/identify`
- `POST /sdk/events`
- `POST /sdk/resolve`
- `POST /sdk/resolve/batch`
