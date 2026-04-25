# Pollex Tactus API

Phase 1 implements the Tactus Engine backend only: SDK identify, event ingestion, resolve, and batch resolve.

## Requirements

- Python 3.11+
- PostgreSQL

## Environment

Set `DATABASE_URL` for the API and Alembic:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/pollex
```

Optional:

```bash
APP_NAME="Pollex Tactus API"
ENVIRONMENT=development
TACTUS_LLM_PROVIDER=none
```

## Tactus Agents

Tactus runs deterministic agents by default. Hosted or local model specialists are only used when deterministic proposal logic has no good answer and you opt in with environment variables.

```bash
# disabled, default
TACTUS_LLM_PROVIDER=none

# OpenAI-compatible provider
TACTUS_LLM_PROVIDER=openai
TACTUS_LLM_MODEL=gpt-5-nano
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1

# Local Ollama provider
TACTUS_LLM_PROVIDER=ollama
TACTUS_LLM_MODEL=llama3.2
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

The model payload is compact and sanitized: no subject IDs, raw event streams, screenshots, passwords, OTPs, card data, tokens, or arbitrary context values are sent.

## Install

```bash
cd E:\Maze\pollex\apps\api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Migrate

```bash
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Test

```bash
python -m pytest tests
```

## SDK Endpoints

All SDK endpoints require:

```http
Authorization: Bearer <api-key>
```

Available endpoints:

- `POST /sdk/identify`
- `POST /sdk/events`
- `POST /sdk/resolve`
- `POST /sdk/resolve/batch`

API keys are stored only as SHA-256 hashes in `api_keys.key_hash`.
