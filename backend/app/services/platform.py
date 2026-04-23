import json
import os
from base64 import urlsafe_b64decode, urlsafe_b64encode
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.entities import IssueSummary, SessionEvent, SessionSummary
from app.services.privacy import sanitize_metadata
from app.services.security import generate_api_key, hash_api_key
from app.settings import settings

DEVICE_CLASS_PHONE = "phone"
DEVICE_CLASS_DESKTOP = "desktop"
WEB_PHONE_MAX_WIDTH = 768


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_platform(platform: str | None) -> str | None:
    if platform is None:
        return None
    normalized = platform.strip().lower()
    return normalized or None


def classify_device_class(platform: str | None, screen_width: float | None) -> str:
    normalized_platform = normalize_platform(platform)
    if normalized_platform in {"ios", "android"}:
        return DEVICE_CLASS_PHONE
    if normalized_platform == "web":
        if screen_width is not None and screen_width >= WEB_PHONE_MAX_WIDTH:
            return DEVICE_CLASS_DESKTOP
        return DEVICE_CLASS_PHONE
    return DEVICE_CLASS_PHONE


def normalize_heatmap_device_class(requested: str | None) -> str | None:
    if requested is None:
        return None
    normalized = requested.strip().lower()
    if normalized in {DEVICE_CLASS_PHONE, DEVICE_CLASS_DESKTOP}:
        return normalized
    return None


def select_heatmap_device_class(requested: str | None, available: list[str]) -> str:
    normalized_requested = normalize_heatmap_device_class(requested)
    if normalized_requested is not None:
        if normalized_requested in available:
            return normalized_requested
        available_label = ", ".join(available) if available else "none"
        raise ValueError(f"Requested device_class '{normalized_requested}' is unavailable. Available device classes: {available_label}.")
    if requested is not None:
        raise ValueError("device_class must be 'phone' or 'desktop'.")
    if DEVICE_CLASS_PHONE in available:
        return DEVICE_CLASS_PHONE
    if available:
        return available[0]
    return DEVICE_CLASS_PHONE


def ensure_partition_for_timestamp(db: Session, occurred_at: datetime) -> None:
    month_start = occurred_at.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    partition_name = f"events_{month_start.year}_{month_start.month:02d}"
    month_start_literal = month_start.strftime("%Y-%m-%d")
    next_month_literal = next_month.strftime("%Y-%m-%d")

    db.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS {partition_name}
            PARTITION OF events
            FOR VALUES FROM ('{month_start_literal}') TO ('{next_month_literal}')
            """
        )
    )
    db.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{partition_name}_ws_time ON {partition_name}(workspace_id, occurred_at)"))
    db.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{partition_name}_ws_screen ON {partition_name}(workspace_id, screen)"))


def maybe_create_subscription(db: Session, workspace_id: str) -> None:
    if not settings.default_plan_id:
        return

    plan = db.execute(text("SELECT id FROM plans WHERE id = :plan_id"), {"plan_id": settings.default_plan_id}).scalar_one_or_none()
    if plan is None:
        return

    existing = db.execute(
        text("SELECT id FROM subscriptions WHERE workspace_id = :workspace_id LIMIT 1"),
        {"workspace_id": workspace_id},
    ).scalar_one_or_none()
    if existing:
        return

    now = datetime.now(UTC)
    db.execute(
        text(
            """
            INSERT INTO subscriptions (
                workspace_id,
                plan_id,
                current_period_start,
                current_period_end
            )
            VALUES (:workspace_id, :plan_id, :period_start, :period_end)
            """
        ),
        {
            "workspace_id": workspace_id,
            "plan_id": settings.default_plan_id,
            "period_start": now,
            "period_end": now + timedelta(days=30),
        },
    )


def ensure_workspace_settings_row(db: Session, workspace_id: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO workspace_settings (workspace_id, api_base_url, auth_provider, ingestion_mode, masking)
            VALUES (CAST(:workspace_id AS uuid), :api_base_url, 'maze-backend', 'batched', 'strict')
            ON CONFLICT (workspace_id) DO NOTHING
            """
        ),
        {"workspace_id": workspace_id, "api_base_url": settings.public_api_base_url},
    )


def create_user_and_workspace(db: Session, email: str, password_hash: str, workspace_name: str) -> dict[str, str]:
    user_row = db.execute(
        text(
            """
            INSERT INTO users (email, password_hash)
            VALUES (:email, :password_hash)
            RETURNING id::text AS id, email
            """
        ),
        {"email": normalize_email(email), "password_hash": password_hash},
    ).mappings().one()

    workspace_row = db.execute(
        text(
            """
            INSERT INTO workspaces (owner_id, name)
            VALUES (:owner_id, :name)
            RETURNING id::text AS id, name
            """
        ),
        {"owner_id": user_row["id"], "name": workspace_name.strip()},
    ).mappings().one()

    maybe_create_subscription(db, workspace_row["id"])
    ensure_workspace_settings_row(db, workspace_row["id"])
    db.commit()
    account = get_account_by_ids(db, user_row["id"], workspace_row["id"])
    if account is None:
        raise ValueError("Account not found after signup.")
    return account


def get_account_by_email(db: Session, email: str) -> dict[str, str] | None:
    row = db.execute(
        text(
            """
            SELECT
                u.id::text AS user_id,
                u.email,
                u.password_hash,
                w.id::text AS workspace_id,
                w.name AS workspace_name,
                sub.plan_id,
                sub.plan_name
            FROM users u
            JOIN workspaces w ON w.owner_id = u.id
            LEFT JOIN LATERAL (
                SELECT s.plan_id, p.name AS plan_name
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.workspace_id = w.id
                ORDER BY s.created_at DESC
                LIMIT 1
            ) sub ON true
            WHERE u.email = :email
            ORDER BY w.created_at ASC
            LIMIT 1
            """
        ),
        {"email": normalize_email(email)},
    ).mappings().one_or_none()
    return dict(row) if row else None


def get_account_by_ids(db: Session, user_id: str, workspace_id: str) -> dict[str, str] | None:
    row = db.execute(
        text(
            """
            SELECT
                u.id::text AS user_id,
                u.email,
                w.id::text AS workspace_id,
                w.name AS workspace_name,
                sub.plan_id,
                sub.plan_name
            FROM users u
            JOIN workspaces w ON w.owner_id = u.id
            LEFT JOIN LATERAL (
                SELECT s.plan_id, p.name AS plan_name
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.workspace_id = w.id
                ORDER BY s.created_at DESC
                LIMIT 1
            ) sub ON true
            WHERE u.id = CAST(:user_id AS uuid) AND w.id = CAST(:workspace_id AS uuid)
            LIMIT 1
            """
        ),
        {"user_id": user_id, "workspace_id": workspace_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def update_account_profile(db: Session, user_id: str, workspace_id: str, email: str, workspace_name: str) -> dict[str, str]:
    normalized_email = normalize_email(email)
    db.execute(
        text(
            """
            UPDATE users
            SET email = :email
            WHERE id = CAST(:user_id AS uuid)
            """
        ),
        {"user_id": user_id, "email": normalized_email},
    )
    db.execute(
        text(
            """
            UPDATE workspaces
            SET name = :workspace_name
            WHERE id = CAST(:workspace_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "workspace_name": workspace_name.strip()},
    )
    db.commit()
    account = get_account_by_ids(db, user_id, workspace_id)
    if account is None:
        raise ValueError("Account not found after profile update.")
    return account


def list_api_keys(db: Session, workspace_id: str) -> list[dict[str, str | datetime | None]]:
    rows = db.execute(
        text(
            """
            SELECT
                ak.id::text AS id,
                ak.label AS name,
                COALESCE(ak.key_prefix, CASE WHEN ak.environment = 'test' THEN 'mz_test_' ELSE 'mz_live_' END) AS prefix,
                ak.created_at AS "createdAt",
                MAX(uk.date)::timestamptz AS "lastUsedAt"
            FROM api_keys ak
            LEFT JOIN api_key_usage_daily uk ON uk.api_key_id = ak.id
            WHERE ak.workspace_id = CAST(:workspace_id AS uuid)
              AND ak.revoked = false
            GROUP BY ak.id, ak.label, ak.created_at
            ORDER BY ak.created_at DESC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def create_workspace_api_key(db: Session, workspace_id: str, label: str, environment: str) -> dict[str, str | datetime]:
    prefix = "mz_live_" if environment == "live" else "mz_test_"
    raw_key = generate_api_key(prefix)
    row = db.execute(
        text(
            """
            INSERT INTO api_keys (workspace_id, key_hash, label, environment, key_prefix)
            VALUES (CAST(:workspace_id AS uuid), :key_hash, :label, :environment, :key_prefix)
            RETURNING id::text AS id, label AS name, created_at AS "createdAt", key_prefix AS prefix
            """
        ),
        {
            "workspace_id": workspace_id,
            "key_hash": hash_api_key(raw_key),
            "label": label.strip(),
            "environment": environment,
            "key_prefix": prefix,
        },
    ).mappings().one()
    db.commit()
    return {
        "id": row["id"],
        "name": row["name"],
        "createdAt": row["createdAt"],
        "prefix": row["prefix"],
        "token": raw_key,
    }


def resolve_api_key(db: Session, api_key: str) -> dict[str, str] | None:
    row = db.execute(
        text(
            """
            SELECT
                ak.id::text AS api_key_id,
                ak.workspace_id::text AS workspace_id,
                w.name AS workspace_name
            FROM api_keys ak
            JOIN workspaces w ON w.id = ak.workspace_id
            WHERE ak.key_hash = :key_hash
              AND ak.revoked = false
            LIMIT 1
            """
        ),
        {"key_hash": hash_api_key(api_key)},
    ).mappings().one_or_none()
    return dict(row) if row else None


def record_api_key_usage(db: Session, api_key_id: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO api_key_usage_daily (api_key_id, date, request_count)
            VALUES (CAST(:api_key_id AS uuid), CURRENT_DATE, 1)
            ON CONFLICT (api_key_id, date)
            DO UPDATE SET request_count = api_key_usage_daily.request_count + 1
            """
        ),
        {"api_key_id": api_key_id},
    )


def increment_usage(db: Session, workspace_id: str, event_count: int, api_request_count: int, new_sessions: int) -> None:
    db.execute(
        text(
            """
            INSERT INTO usage_daily (workspace_id, date, events_count, sessions_count, api_requests_count)
            VALUES (CAST(:workspace_id AS uuid), CURRENT_DATE, :events_count, :sessions_count, :api_requests_count)
            ON CONFLICT (workspace_id, date)
            DO UPDATE SET
                events_count = usage_daily.events_count + EXCLUDED.events_count,
                sessions_count = usage_daily.sessions_count + EXCLUDED.sessions_count,
                api_requests_count = usage_daily.api_requests_count + EXCLUDED.api_requests_count
            """
        ),
        {
            "workspace_id": workspace_id,
            "events_count": event_count,
            "sessions_count": new_sessions,
            "api_requests_count": api_request_count,
        },
    )
    db.execute(
        text(
            """
            INSERT INTO usage_monthly (workspace_id, month, events_count, sessions_count, api_requests_count)
            VALUES (CAST(:workspace_id AS uuid), date_trunc('month', CURRENT_DATE)::date, :events_count, :sessions_count, :api_requests_count)
            ON CONFLICT (workspace_id, month)
            DO UPDATE SET
                events_count = usage_monthly.events_count + EXCLUDED.events_count,
                sessions_count = usage_monthly.sessions_count + EXCLUDED.sessions_count,
                api_requests_count = usage_monthly.api_requests_count + EXCLUDED.api_requests_count
            """
        ),
        {
            "workspace_id": workspace_id,
            "events_count": event_count,
            "sessions_count": new_sessions,
            "api_requests_count": api_request_count,
        },
    )


def _safe_percent(used: int, limit: int | None) -> float | None:
    if limit is None or limit <= 0:
        return None
    return round((used / limit) * 100, 2)


def _backfill_usage_monthly_if_missing(db: Session, workspace_id: str, month_start: datetime, next_month_start: datetime) -> None:
    existing = db.execute(
        text(
            """
            SELECT 1
            FROM usage_monthly
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND month = CAST(:month_start AS date)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start.date()},
    ).scalar_one_or_none()
    if existing is not None:
        return

    events_count = db.execute(
        text(
            """
            SELECT COUNT(*)::bigint
            FROM events
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND occurred_at >= :month_start
              AND occurred_at < :next_month_start
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start, "next_month_start": next_month_start},
    ).scalar_one()

    sessions_count = db.execute(
        text(
            """
            SELECT COUNT(*)::bigint
            FROM sessions
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND started_at >= :month_start
              AND started_at < :next_month_start
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start, "next_month_start": next_month_start},
    ).scalar_one()

    api_requests_count = db.execute(
        text(
            """
            SELECT COALESCE(SUM(aku.request_count), 0)::bigint
            FROM api_key_usage_daily aku
            JOIN api_keys ak ON ak.id = aku.api_key_id
            WHERE ak.workspace_id = CAST(:workspace_id AS uuid)
              AND aku.date >= CAST(:month_start AS date)
              AND aku.date < CAST(:next_month_start AS date)
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start.date(), "next_month_start": next_month_start.date()},
    ).scalar_one()

    db.execute(
        text(
            """
            INSERT INTO usage_monthly (workspace_id, month, events_count, sessions_count, api_requests_count)
            VALUES (
              CAST(:workspace_id AS uuid),
              CAST(:month_start AS date),
              :events_count,
              :sessions_count,
              :api_requests_count
            )
            ON CONFLICT (workspace_id, month)
            DO UPDATE SET
              events_count = EXCLUDED.events_count,
              sessions_count = EXCLUDED.sessions_count,
              api_requests_count = EXCLUDED.api_requests_count
            """
        ),
        {
            "workspace_id": workspace_id,
            "month_start": month_start.date(),
            "events_count": int(events_count or 0),
            "sessions_count": int(sessions_count or 0),
            "api_requests_count": int(api_requests_count or 0),
        },
    )
    db.commit()


def get_workspace_usage(db: Session, workspace_id: str, month: str | None = None) -> dict:
    if month:
        try:
            parsed = datetime.strptime(month, "%Y-%m")
            now = parsed.replace(tzinfo=UTC)
        except ValueError:
            now = datetime.now(UTC)
    else:
        now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month_start = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    month_end = next_month_start - timedelta(microseconds=1)
    _backfill_usage_monthly_if_missing(db, workspace_id, month_start, next_month_start)

    row = db.execute(
        text(
            """
            SELECT
                w.id::text AS workspace_id,
                w.name AS workspace_name,
                sub.plan_id,
                sub.plan_name,
                sub.max_events_per_month,
                sub.max_sessions_per_month,
                sub.max_api_requests_per_minute,
                COALESCE(um.events_count, 0)::bigint AS events_used,
                COALESCE(um.sessions_count, 0)::bigint AS sessions_used,
                COALESCE(um.api_requests_count, 0)::bigint AS api_requests_used
            FROM workspaces w
            LEFT JOIN LATERAL (
                SELECT
                    s.plan_id,
                    p.name AS plan_name,
                    p.max_events_per_month,
                    p.max_sessions_per_month,
                    p.max_api_requests_per_minute
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.workspace_id = w.id
                ORDER BY s.created_at DESC
                LIMIT 1
            ) sub ON true
            LEFT JOIN usage_monthly um
              ON um.workspace_id = w.id
             AND um.month = CAST(:month_start AS date)
            WHERE w.id = CAST(:workspace_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start.date()},
    ).mappings().one()

    daily_rows = db.execute(
        text(
            """
            SELECT
              date::text AS date,
              events_count::bigint AS events,
              sessions_count::bigint AS sessions,
              api_requests_count::bigint AS api_requests
            FROM usage_daily
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND date >= CAST(:month_start AS date)
              AND date < CAST(:next_month_start AS date)
            ORDER BY date ASC
            """
        ),
        {"workspace_id": workspace_id, "month_start": month_start.date(), "next_month_start": next_month_start.date()},
    ).mappings().all()

    events_used = int(row["events_used"] or 0)
    sessions_used = int(row["sessions_used"] or 0)
    api_requests_used = int(row["api_requests_used"] or 0)

    events_limit = int(row["max_events_per_month"]) if row["max_events_per_month"] is not None else None
    sessions_limit = int(row["max_sessions_per_month"]) if row["max_sessions_per_month"] is not None else None
    api_requests_limit = int(row["max_api_requests_per_minute"]) if row["max_api_requests_per_minute"] is not None else None

    return {
        "workspaceId": row["workspace_id"],
        "workspaceName": row["workspace_name"],
        "planId": row["plan_id"],
        "planName": row["plan_name"],
        "monthStart": month_start.date().isoformat(),
        "monthEnd": month_end.date().isoformat(),
        "events": {
            "used": events_used,
            "limit": events_limit,
            "percent": _safe_percent(events_used, events_limit),
        },
        "sessions": {
            "used": sessions_used,
            "limit": sessions_limit,
            "percent": _safe_percent(sessions_used, sessions_limit),
        },
        "apiRequests": {
            "used": api_requests_used,
            "limit": api_requests_limit,
            "percent": _safe_percent(api_requests_used, api_requests_limit),
        },
        "daily": [
            {
                "date": row_item["date"],
                "events": int(row_item["events"] or 0),
                "sessions": int(row_item["sessions"] or 0),
                "apiRequests": int(row_item["api_requests"] or 0),
            }
            for row_item in daily_rows
        ],
        "updatedAt": datetime.now(UTC).isoformat(),
    }


def log_ingestion(db: Session, workspace_id: str | None, status: str, reason: str | None = None) -> None:
    db.execute(
        text(
            """
            INSERT INTO ingestion_logs (workspace_id, status, reason)
            VALUES (CAST(:workspace_id AS uuid), CAST(:status AS ingestion_status), :reason)
            """
        ),
        {"workspace_id": workspace_id, "status": status, "reason": reason},
    )


def ingest_events(db: Session, workspace_id: str, api_key_id: str, events: list[dict]) -> int:
    accepted = 0
    new_sessions = 0
    masking = get_workspace_settings(db, workspace_id)["masking"]

    for event in events:
        try:
            session_uuid = str(UUID(event["session_id"]))
        except ValueError as exc:
            log_ingestion(db, workspace_id, "rejected", f"Invalid session_id: {exc}")
            db.commit()
            raise ValueError("session_id must be a UUID string.") from exc

        device_id = event["device_id"].strip()
        if not device_id:
            log_ingestion(db, workspace_id, "rejected", "device_id is required.")
            db.commit()
            raise ValueError("device_id is required.")

        platform = normalize_platform(event.get("platform"))
        device_class = classify_device_class(platform, event.get("screen_width"))

        ensure_partition_for_timestamp(db, event["occurred_at"])
        inserted_session = db.execute(
            text(
                """
                INSERT INTO sessions (
                    id,
                    workspace_id,
                    device_id,
                    app_version,
                    platform,
                    device_class,
                    screen_width,
                    screen_height,
                    started_at,
                    ended_at
                )
                VALUES (
                    CAST(:session_id AS uuid),
                    CAST(:workspace_id AS uuid),
                    :device_id,
                    :app_version,
                    :platform,
                    :device_class,
                    :screen_width,
                    :screen_height,
                    :occurred_at,
                    :occurred_at
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    device_id = EXCLUDED.device_id,
                    app_version = COALESCE(EXCLUDED.app_version, sessions.app_version),
                    platform = COALESCE(EXCLUDED.platform, sessions.platform),
                    device_class = COALESCE(EXCLUDED.device_class, sessions.device_class, 'phone'),
                    screen_width = COALESCE(EXCLUDED.screen_width, sessions.screen_width),
                    screen_height = COALESCE(EXCLUDED.screen_height, sessions.screen_height),
                    started_at = LEAST(sessions.started_at, EXCLUDED.started_at),
                    ended_at = GREATEST(COALESCE(sessions.ended_at, EXCLUDED.ended_at), EXCLUDED.ended_at)
                RETURNING xmax = 0 AS inserted
                """
            ),
            {
                "session_id": session_uuid,
                "workspace_id": workspace_id,
                "device_id": device_id,
                "app_version": event.get("app_version"),
                "platform": platform,
                "device_class": device_class,
                "screen_width": event.get("screen_width"),
                "screen_height": event.get("screen_height"),
                "occurred_at": event["occurred_at"],
            },
        ).scalar_one()
        if inserted_session:
            new_sessions += 1

        dedup_inserted = db.execute(
            text(
                """
                INSERT INTO event_dedup (workspace_id, event_id)
                VALUES (CAST(:workspace_id AS uuid), :event_id)
                ON CONFLICT (workspace_id, event_id) DO NOTHING
                RETURNING event_id
                """
            ),
            {"workspace_id": workspace_id, "event_id": event["event_id"]},
        ).scalar_one_or_none()
        if dedup_inserted is None:
            continue

        sanitized_metadata = sanitize_metadata(event.get("metadata", {}), masking)
        db.execute(
            text(
                """
                INSERT INTO events (
                    event_id,
                    session_id,
                    workspace_id,
                    event_type,
                    screen,
                    element_id,
                    x,
                    y,
                    screenshot_id,
                    metadata,
                    occurred_at
                )
                VALUES (
                    :event_id,
                    CAST(:session_id AS uuid),
                    CAST(:workspace_id AS uuid),
                    :event_type,
                    :screen,
                    :element_id,
                    :x,
                    :y,
                    CAST(:screenshot_id AS uuid),
                    CAST(:metadata AS jsonb),
                    :occurred_at
                )
                """
            ),
            {
                "event_id": event["event_id"],
                "session_id": session_uuid,
                "workspace_id": workspace_id,
                "event_type": event["event_type"],
                "screen": event.get("screen"),
                "element_id": event.get("element_id"),
                "x": event.get("x"),
                "y": event.get("y"),
                "screenshot_id": str(event["screenshot_id"]) if event.get("screenshot_id") else None,
                "metadata": json.dumps(sanitized_metadata),
                "occurred_at": event["occurred_at"],
            },
        )
        accepted += 1

    record_api_key_usage(db, api_key_id)
    increment_usage(db, workspace_id, accepted, 1, new_sessions)
    replace_workspace_snapshots(db, workspace_id)
    log_ingestion(db, workspace_id, "success", None)
    db.commit()
    return accepted


def get_workspace_settings(db: Session, workspace_id: str) -> dict[str, str]:
    ensure_workspace_settings_row(db, workspace_id)
    row = db.execute(
        text(
            """
            SELECT
                w.id::text AS id,
                w.name,
                ws.api_base_url,
                ws.auth_provider,
                ws.ingestion_mode,
                ws.masking,
                sub.plan_id,
                sub.plan_name
            FROM workspaces w
            LEFT JOIN workspace_settings ws ON ws.workspace_id = w.id
            LEFT JOIN LATERAL (
                SELECT s.plan_id, p.name AS plan_name
                FROM subscriptions s
                JOIN plans p ON p.id = s.plan_id
                WHERE s.workspace_id = w.id
                ORDER BY s.created_at DESC
                LIMIT 1
            ) sub ON true
            WHERE w.id = CAST(:workspace_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().one()
    return {
        "workspaceId": row["id"],
        "workspaceName": row["name"],
        "apiBaseUrl": row["api_base_url"] or settings.public_api_base_url,
        "authProvider": row["auth_provider"] or "maze-backend",
        "ingestionMode": row["ingestion_mode"] or "batched",
        "masking": row["masking"] or "strict",
        "planId": row["plan_id"],
        "planName": row["plan_name"],
    }


def update_workspace_settings(db: Session, workspace_id: str, payload: dict[str, str]) -> dict[str, str]:
    ensure_workspace_settings_row(db, workspace_id)
    db.execute(
        text(
            """
            UPDATE workspace_settings
            SET
                api_base_url = :api_base_url,
                auth_provider = :auth_provider,
                ingestion_mode = :ingestion_mode,
                masking = :masking,
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            """
        ),
        {
            "workspace_id": workspace_id,
            "api_base_url": payload["apiBaseUrl"].strip(),
            "auth_provider": payload["authProvider"].strip(),
            "ingestion_mode": payload["ingestionMode"].strip(),
            "masking": payload["masking"].strip(),
        },
    )
    db.commit()
    return get_workspace_settings(db, workspace_id)


def list_workspace_sessions(db: Session, workspace_id: str, limit: int | None = None) -> list[SessionSummary]:
    query = """
            SELECT
                s.id::text AS session_id,
                s.device_id,
                s.platform,
                COALESCE(s.device_class, 'phone') AS device_class,
                s.started_at AS start_time,
                COALESCE(s.ended_at, s.started_at) AS end_time,
                latest.screen AS last_screen
            FROM sessions s
            LEFT JOIN LATERAL (
                SELECT e.screen
                FROM events e
                WHERE e.session_id = s.id
                ORDER BY e.occurred_at DESC
                LIMIT 1
            ) latest ON true
            WHERE s.workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY s.started_at DESC
            """
    if limit is not None:
        query += "\nLIMIT :limit"

    params = {"workspace_id": workspace_id}
    if limit is not None:
        params["limit"] = limit

    rows = db.execute(text(query), params).mappings().all()
    return [
        SessionSummary(
            session_id=row["session_id"],
            device_id=row["device_id"],
            start_time=row["start_time"],
            end_time=row["end_time"],
            last_screen=row["last_screen"],
            dropped_off=(row["last_screen"] or "") != "success",
            platform=row["platform"],
            device_class=row["device_class"],
        )
        for row in rows
    ]


def list_session_events(db: Session, workspace_id: str) -> list[SessionEvent]:
    rows = db.execute(
        text(
            """
            SELECT
                e.session_id::text AS session_id,
                s.device_id,
                e.occurred_at,
                e.event_type,
                e.screen,
                e.element_id,
                e.x,
                e.y
            FROM events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.workspace_id = CAST(:workspace_id AS uuid)
              AND e.occurred_at >= NOW() - INTERVAL '30 days'
            ORDER BY e.occurred_at ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [SessionEvent(**dict(row)) for row in rows]


def detect_issues(events: list[SessionEvent]) -> list[IssueSummary]:
    grouped: dict[str, list[SessionEvent]] = defaultdict(list)
    for event in events:
        grouped[event.session_id].append(event)

    issues: list[IssueSummary] = []
    last_screen_by_session: dict[str, str | None] = {}
    device_by_session: dict[str, str] = {}
    for session_id, items in grouped.items():
        ordered = sorted(items, key=lambda item: item.occurred_at)
        last_screen_by_session[session_id] = ordered[-1].screen
        device_by_session[session_id] = ordered[0].device_id

    total_sessions = len(grouped) or 1
    drop_off_counter = Counter(screen for screen in last_screen_by_session.values() if screen and screen != "success")
    for screen, frequency in drop_off_counter.items():
        if frequency >= max(2, total_sessions // 3):
            affected_users = len({device_by_session[session_id] for session_id, last_screen in last_screen_by_session.items() if last_screen == screen})
            issues.append(
                IssueSummary(
                    issue_type="drop_off",
                    screen=screen,
                    element_id=None,
                    frequency=frequency,
                    affected_users_count=affected_users,
                    details={"share_of_sessions": round(frequency / total_sessions, 2)},
                    severity="high",
                )
            )

    rage_tap_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    rage_tap_count: Counter[tuple[str, str]] = Counter()
    dead_tap_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    dead_tap_count: Counter[tuple[str, str]] = Counter()
    slow_response_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    slow_response_count: Counter[tuple[str, str]] = Counter()
    form_friction_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    form_friction_count: Counter[tuple[str, str]] = Counter()

    for session_id, session_events in grouped.items():
        ordered = sorted(session_events, key=lambda item: item.occurred_at)
        for index, event in enumerate(ordered):
            device_id = device_by_session[session_id]
            if event.event_type == "tap" and event.element_id and event.screen:
                window = [
                    candidate
                    for candidate in ordered[index : index + 3]
                    if candidate.event_type == "tap"
                    and candidate.element_id == event.element_id
                    and candidate.screen == event.screen
                    and (candidate.occurred_at - event.occurred_at).total_seconds() <= 2
                ]
                if len(window) >= 3:
                    key = (event.screen, event.element_id)
                    rage_tap_count[key] += 1
                    rage_tap_groups[key].add(device_id)

                next_event = ordered[index + 1] if index + 1 < len(ordered) else None
                if next_event is None or (
                    next_event.screen == event.screen
                    and next_event.event_type in {"tap", "screen_view"}
                    and (next_event.occurred_at - event.occurred_at).total_seconds() > 1.2
                ):
                    key = (event.screen, event.element_id)
                    dead_tap_count[key] += 1
                    dead_tap_groups[key].add(device_id)

                if next_event is not None and (next_event.occurred_at - event.occurred_at).total_seconds() >= 4:
                    key = (event.screen, event.element_id)
                    slow_response_count[key] += 1
                    slow_response_groups[key].add(device_id)

            if event.event_type == "input_error" and event.element_id and event.screen:
                key = (event.screen, event.element_id)
                form_friction_count[key] += 1
                form_friction_groups[key].add(device_id)

    for (screen, element_id), frequency in rage_tap_count.items():
        issues.append(
            IssueSummary(
                issue_type="rage_tap",
                screen=screen,
                element_id=element_id,
                frequency=frequency,
                affected_users_count=len(rage_tap_groups[(screen, element_id)]),
                details={"threshold": ">=3 taps in 2 seconds"},
                severity="high",
            )
        )
    for (screen, element_id), frequency in dead_tap_count.items():
        if frequency >= 2:
            issues.append(
                IssueSummary(
                    issue_type="dead_tap",
                    screen=screen,
                    element_id=element_id,
                    frequency=frequency,
                    affected_users_count=len(dead_tap_groups[(screen, element_id)]),
                    details={"pattern": "tap without meaningful follow-up"},
                    severity="medium",
                )
            )
    for (screen, element_id), frequency in slow_response_count.items():
        issues.append(
            IssueSummary(
                issue_type="slow_response",
                screen=screen,
                element_id=element_id,
                frequency=frequency,
                affected_users_count=len(slow_response_groups[(screen, element_id)]),
                details={"threshold_seconds": 4},
                severity="medium",
            )
        )
    for (screen, element_id), frequency in form_friction_count.items():
        if frequency >= 2:
            issues.append(
                IssueSummary(
                    issue_type="form_friction",
                    screen=screen,
                    element_id=element_id,
                    frequency=frequency,
                    affected_users_count=len(form_friction_groups[(screen, element_id)]),
                    details={"pattern": "repeated input errors"},
                    severity="medium",
                )
            )
    return sorted(issues, key=lambda item: (item.severity != "high", -item.frequency, item.screen or "", item.element_id or ""))


def issue_to_insight(issue: IssueSummary) -> dict:
    if issue.issue_type == "drop_off":
        return {
            "title": f"Users are dropping off on {issue.screen}",
            "impact": f"{issue.frequency} sessions ended on {issue.screen}, affecting {issue.affected_users_count} devices.",
            "reason": [
                f"Recent session reconstruction shows repeated exits on {issue.screen}.",
                "This usually signals confusion, latency, or missing guidance at a critical step.",
            ],
            "suggestions": [
                f"Add clearer progress guidance on {issue.screen}.",
                "Measure client and backend latency around the exit point.",
                "Test a simpler CTA hierarchy or reduce required fields.",
            ],
        }
    if issue.issue_type == "rage_tap":
        return {
            "title": f"Rage taps detected on {issue.element_id}",
            "impact": f"{issue.frequency} rage-tap clusters were detected on {issue.screen}.",
            "reason": [
                "Users tapped the same element at least three times within two seconds.",
                "This often means the UI appears unresponsive or the action result is unclear.",
            ],
            "suggestions": [
                "Add immediate loading and disabled states after tap.",
                "Confirm whether the CTA is blocked by validation or a network request.",
                "Make failure states explicit near the button.",
            ],
        }
    if issue.issue_type == "dead_tap":
        return {
            "title": f"Dead taps on {issue.element_id} suggest broken affordances",
            "impact": f"{issue.frequency} taps on {issue.element_id} had no clear outcome.",
            "reason": [
                "The element received taps without a meaningful follow-up event.",
                "This can indicate a disabled control, hitbox issue, or missing action wiring.",
            ],
            "suggestions": [
                "Verify the control is interactive in all states.",
                "Check tap target size and gesture conflicts.",
                "Track explicit success and validation events after the tap.",
            ],
        }
    if issue.issue_type == "slow_response":
        return {
            "title": f"Slow response after interacting with {issue.element_id}",
            "impact": f"{issue.frequency} slow transitions were observed on {issue.screen}.",
            "reason": [
                "There was a large delay between the user action and the next event.",
                "Slow handoffs can create uncertainty and increase abandonment.",
            ],
            "suggestions": [
                "Measure API latency and client rendering for this step.",
                "Show progress feedback immediately after submission.",
                "Consider optimistic transitions when safe.",
            ],
        }
    return {
        "title": f"Form friction on {issue.element_id}",
        "impact": f"{issue.frequency} repeated input failures were seen on {issue.screen}.",
        "reason": [
            "Users repeated the same input flow with validation errors.",
            "This usually means the form expectations are not obvious enough.",
        ],
        "suggestions": [
            "Move validation hints closer to the field.",
            "Clarify formatting requirements before submit.",
            "Reduce manual entry where possible.",
        ],
    }


def list_available_heatmap_device_classes(db: Session, workspace_id: str, screen: str) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT device_class
            FROM (
                SELECT DISTINCT COALESCE(s.device_class, 'phone') AS device_class
                FROM events e
                JOIN sessions s ON s.id = e.session_id
                WHERE e.workspace_id = CAST(:workspace_id AS uuid)
                  AND e.screen = :screen
                  AND e.event_type = 'tap'
                  AND e.x IS NOT NULL
                  AND e.y IS NOT NULL
            ) available_device_classes
            ORDER BY CASE device_class WHEN 'phone' THEN 0 ELSE 1 END
            """
        ),
        {"workspace_id": workspace_id, "screen": screen},
    ).scalars().all()
    return [row for row in rows if row in {DEVICE_CLASS_PHONE, DEVICE_CLASS_DESKTOP}]


def build_heatmap_points(
    db: Session,
    workspace_id: str,
    screen: str,
    device_class: str | None = None,
) -> list[dict[str, float | int]]:
    normalized_device_class = normalize_heatmap_device_class(device_class)
    query = """
            SELECT
                ROUND(
                    COALESCE(
                        CASE
                            WHEN e.metadata ? '__pollex_page_x' THEN NULLIF(e.metadata->>'__pollex_page_x', '')::float8
                            ELSE NULL
                        END,
                        e.x
                    )::numeric,
                    2
                )::float8 AS x,
                ROUND(
                    COALESCE(
                        CASE
                            WHEN e.metadata ? '__pollex_page_y' THEN NULLIF(e.metadata->>'__pollex_page_y', '')::float8
                            ELSE NULL
                        END,
                        e.y
                    )::numeric,
                    2
                )::float8 AS y,
                COUNT(*)::int AS count
            FROM events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.workspace_id = CAST(:workspace_id AS uuid)
              AND e.screen = :screen
              AND e.event_type = 'tap'
              AND e.x IS NOT NULL
              AND e.y IS NOT NULL
    """
    params: dict[str, str] = {"workspace_id": workspace_id, "screen": screen}
    if normalized_device_class is not None:
        query += "\n              AND COALESCE(s.device_class, 'phone') = :device_class"
        params["device_class"] = normalized_device_class
    query += """
            GROUP BY 1, 2
            ORDER BY count DESC, x ASC, y ASC
    """
    rows = db.execute(
        text(query),
        params,
    ).mappings().all()
    return [dict(row) for row in rows]


def build_heatmap_payload(db: Session, workspace_id: str, screen: str, requested_device_class: str | None) -> dict:
    available = list_available_heatmap_device_classes(db, workspace_id, screen)
    active_device_class = select_heatmap_device_class(requested_device_class, available)
    return {
        "screen": screen,
        "deviceClass": active_device_class,
        "availableDeviceClasses": available or [active_device_class],
        "points": build_heatmap_points(db, workspace_id, screen, active_device_class),
    }


def build_heatmap_scenario(db: Session, workspace_id: str) -> dict:
    rows = db.execute(
        text(
            """
            SELECT screen, COUNT(*)::int AS total_taps
            FROM events
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND event_type = 'tap'
              AND screen IS NOT NULL
            GROUP BY screen
            ORDER BY total_taps DESC, screen ASC
            LIMIT 3
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    selected_screens = [row["screen"] for row in rows] or ["welcome"]
    steps = []
    for index, screen in enumerate(selected_screens, start=1):
        points = build_heatmap_points(db, workspace_id, screen)
        steps.append(
            {
                "screen": screen,
                "title": f"Step {index}: {screen.replace('_', ' ').title()}",
                "summary": f"Live tap density is being aggregated from the {screen} screen.",
                "focus_area": "Highest-density interaction zones from recent traffic",
                "total_taps": sum(int(point["count"]) for point in points),
                "clustered_points": len(points),
            }
        )
    return {
        "id": "live_workspace_heatmap",
        "name": "Live workspace heatmap walkthrough",
        "summary": "A backend-generated view of the screens receiving the most recent tap activity in this workspace.",
        "steps": steps,
    }


def build_integration_status(db: Session, workspace_id: str) -> dict:
    latest_success = db.execute(
        text(
            """
            SELECT created_at
            FROM ingestion_logs
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND status = 'success'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id},
    ).scalar_one_or_none()
    latest_log = db.execute(
        text(
            """
            SELECT status::text AS status, reason, created_at
            FROM ingestion_logs
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().one_or_none()
    api_key_count = db.execute(
        text(
            """
            SELECT COUNT(*)::int
            FROM api_keys
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND revoked = false
            """
        ),
        {"workspace_id": workspace_id},
    ).scalar_one()
    recent_activity = db.execute(
        text(
            """
            SELECT
                COUNT(*)::int AS event_count,
                COUNT(DISTINCT session_id)::int AS session_count,
                MAX(occurred_at) AS last_event_at
            FROM events
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND occurred_at >= NOW() - INTERVAL '24 hours'
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().one()

    if recent_activity["event_count"] > 0 and latest_success is not None:
        ingestion_status = "healthy"
        ingestion_detail = f"{recent_activity['event_count']} events from {recent_activity['session_count']} sessions in the last 24h"
    elif latest_log is not None and latest_log["status"] == "rejected":
        ingestion_status = "degraded"
        ingestion_detail = latest_log["reason"] or "Recent ingestion attempts were rejected"
    else:
        ingestion_status = "offline"
        ingestion_detail = "No SDK events have reached Maze yet"

    if api_key_count > 0:
        key_status = "configured"
        key_detail = f"{api_key_count} active API key{'s' if api_key_count != 1 else ''}"
    else:
        key_status = "attention"
        key_detail = "Generate an API key in Settings to connect your SDK"

    session_count = recent_activity["session_count"]
    if session_count > 0:
        session_status = "healthy"
        session_detail = f"{session_count} tracked session{'s' if session_count != 1 else ''} in the last 24h"
    else:
        session_status = "offline"
        session_detail = "No recent sessions have been observed"

    last_seen_detail = "Never seen"
    if recent_activity["last_event_at"] is not None:
        last_seen_detail = f"Last event at {recent_activity['last_event_at'].isoformat()}"
    elif latest_log is not None:
        last_seen_detail = f"Last ingestion log at {latest_log['created_at'].isoformat()}"

    return {
        "services": [
            {"name": "Mobile SDK ingestion", "status": ingestion_status, "path": ingestion_detail},
            {"name": "SDK credentials", "status": key_status, "path": key_detail},
            {"name": "Recent session traffic", "status": session_status, "path": session_detail},
            {"name": "Latest Maze activity", "status": "connected" if latest_log is not None else "offline", "path": last_seen_detail},
        ]
    }


def replace_workspace_snapshots(db: Session, workspace_id: str) -> None:
    issues = detect_issues(list_session_events(db, workspace_id))
    db.execute(text("DELETE FROM issues WHERE workspace_id = CAST(:workspace_id AS uuid)"), {"workspace_id": workspace_id})
    db.execute(text("DELETE FROM insights WHERE workspace_id = CAST(:workspace_id AS uuid)"), {"workspace_id": workspace_id})

    for issue in issues:
        db.execute(
            text(
                """
                INSERT INTO issues (
                    workspace_id,
                    session_id,
                    type,
                    severity,
                    screen,
                    element_id,
                    frequency,
                    affected_users_count,
                    details,
                    detected_at
                )
                VALUES (
                    CAST(:workspace_id AS uuid),
                    NULL,
                    :issue_type,
                    :severity,
                    :screen,
                    :element_id,
                    :frequency,
                    :affected_users_count,
                    CAST(:details AS jsonb),
                    now()
                )
                """
            ),
            {
                "workspace_id": workspace_id,
                "issue_type": issue.issue_type,
                "severity": issue.severity,
                "screen": issue.screen,
                "element_id": issue.element_id,
                "frequency": issue.frequency,
                "affected_users_count": issue.affected_users_count,
                "details": json.dumps(issue.details),
            },
        )

        insight = issue_to_insight(issue)
        db.execute(
            text(
                """
                INSERT INTO insights (
                    workspace_id,
                    title,
                    body,
                    severity,
                    generated_at,
                    issue_type,
                    screen,
                    element_id,
                    frequency,
                    affected_users_count,
                    payload
                )
                VALUES (
                    CAST(:workspace_id AS uuid),
                    :title,
                    :body,
                    :severity,
                    now(),
                    :issue_type,
                    :screen,
                    :element_id,
                    :frequency,
                    :affected_users_count,
                    CAST(:payload AS jsonb)
                )
                """
            ),
            {
                "workspace_id": workspace_id,
                "title": insight["title"],
                "body": insight["impact"],
                "severity": issue.severity,
                "issue_type": issue.issue_type,
                "screen": issue.screen,
                "element_id": issue.element_id,
                "frequency": issue.frequency,
                "affected_users_count": issue.affected_users_count,
                "payload": json.dumps(insight),
            },
        )


def list_workspace_issue_snapshots(db: Session, workspace_id: str) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                id::text AS id,
                type,
                screen,
                element_id,
                frequency,
                affected_users_count,
                details,
                severity
            FROM issues
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY
                CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                frequency DESC,
                detected_at DESC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def list_workspace_insight_snapshots(db: Session, workspace_id: str) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                title,
                issue_type,
                screen,
                element_id,
                frequency,
                affected_users_count,
                payload
            FROM insights
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY generated_at DESC, frequency DESC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def serialize_issue(issue: IssueSummary) -> dict:
    return {
        "id": f"{issue.issue_type}:{issue.screen or 'unknown'}:{issue.element_id or 'all'}",
        "type": issue.issue_type,
        "screen": issue.screen,
        "element_id": issue.element_id,
        "frequency": issue.frequency,
        "affected_users_count": issue.affected_users_count,
        "details": issue.details,
        "severity": issue.severity,
    }


def serialize_session(session: SessionSummary) -> dict:
    return {
        "session_id": session.session_id,
        "device_id": session.device_id,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "last_screen": session.last_screen,
        "dropped_off": session.dropped_off,
        "platform": session.platform,
        "device_class": session.device_class,
    }


def _screenshot_storage_root() -> Path:
    root = Path(settings.screenshot_storage_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def purge_expired_screenshots(db: Session) -> None:
    rows = db.execute(
        text(
            """
            SELECT id::text AS screenshot_id, object_key
            FROM screenshot_assets
            WHERE expires_at <= now()
            """
        )
    ).mappings().all()
    if not rows:
        return
    root = _screenshot_storage_root()
    for row in rows:
        path = root / row["object_key"]
        if path.exists():
            path.unlink(missing_ok=True)
    db.execute(text("DELETE FROM screenshot_assets WHERE expires_at <= now()"))
    db.commit()


def _sign_screenshot_payload(screenshot_id: str, expires_unix: int) -> str:
    payload = f"{screenshot_id}.{expires_unix}".encode("utf-8")
    digest = hmac.new(settings.screenshot_signing_secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def generate_screenshot_token(screenshot_id: str, expires_unix: int) -> str:
    signature = _sign_screenshot_payload(screenshot_id, expires_unix)
    token_payload = f"{screenshot_id}.{expires_unix}.{signature}".encode("utf-8")
    return urlsafe_b64encode(token_payload).decode("utf-8").rstrip("=")


def verify_screenshot_token(screenshot_id: str, token: str) -> bool:
    try:
        padded = token + "=" * (-len(token) % 4)
        decoded = urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        token_screenshot_id, expires_raw, signature = decoded.split(".", 2)
        expires_unix = int(expires_raw)
    except Exception:
        return False
    if token_screenshot_id != screenshot_id:
        return False
    if expires_unix < int(datetime.now(UTC).timestamp()):
        return False
    expected = _sign_screenshot_payload(screenshot_id, expires_unix)
    return hmac.compare_digest(expected, signature)


def store_screenshot_asset(
    db: Session,
    workspace_id: str,
    session_id: str | None,
    screen: str | None,
    content_type: str,
    payload: bytes,
    width: int | None,
    height: int | None,
) -> dict:
    purge_expired_screenshots(db)
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=settings.screenshot_object_ttl_seconds)
    screenshot_id = str(uuid4())
    extension = ".jpg" if content_type == "image/jpeg" else ".png"
    object_key = f"{workspace_id}/{screenshot_id}{extension}"
    row = db.execute(
        text(
            """
            INSERT INTO screenshot_assets (
                id,
                workspace_id,
                session_id,
                screen,
                object_key,
                content_type,
                width,
                height,
                byte_size,
                expires_at
            )
            VALUES (
                CAST(:id AS uuid),
                CAST(:workspace_id AS uuid),
                CAST(:session_id AS uuid),
                :screen,
                :object_key,
                :content_type,
                :width,
                :height,
                :byte_size,
                :expires_at
            )
            RETURNING id::text AS id, object_key, uploaded_at, expires_at
            """
        ),
        {
            "id": screenshot_id,
            "workspace_id": workspace_id,
            "session_id": session_id,
            "screen": screen,
            "object_key": object_key,
            "content_type": content_type,
            "width": width,
            "height": height,
            "byte_size": len(payload),
            "expires_at": expires_at,
        },
    ).mappings().one()
    db.commit()

    file_path = _screenshot_storage_root() / object_key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(payload)
    return {
        "screenshot_id": screenshot_id,
        "uploaded_at": row["uploaded_at"].isoformat(),
        "expires_at": expires_at.isoformat(),
        "object_key": object_key,
    }


def list_workspace_screenshots(
    db: Session,
    workspace_id: str,
    screen: str | None = None,
    session_id: str | None = None,
    device_class: str | None = None,
    limit: int = 10,
) -> list[dict]:
    purge_expired_screenshots(db)
    query = """
        SELECT
            screenshot_assets.id::text AS screenshot_id,
            screenshot_assets.session_id::text AS session_id,
            screenshot_assets.screen,
            screenshot_assets.content_type,
            screenshot_assets.width,
            screenshot_assets.height,
            screenshot_assets.byte_size,
            screenshot_assets.uploaded_at,
            screenshot_assets.expires_at
        FROM screenshot_assets
        LEFT JOIN sessions ON sessions.id = screenshot_assets.session_id
        WHERE screenshot_assets.workspace_id = CAST(:workspace_id AS uuid)
          AND screenshot_assets.expires_at > now()
    """
    params: dict[str, str | int] = {"workspace_id": workspace_id, "limit": limit}
    if screen is not None:
        query += " AND screenshot_assets.screen = :screen"
        params["screen"] = screen
    if session_id is not None:
        query += " AND screenshot_assets.session_id = CAST(:session_id AS uuid)"
        params["session_id"] = session_id
    if device_class is not None:
        query += " AND COALESCE(sessions.device_class, 'phone') = :device_class"
        params["device_class"] = device_class
    query += " ORDER BY screenshot_assets.uploaded_at DESC LIMIT :limit"

    rows = db.execute(text(query), params).mappings().all()

    base = settings.public_api_base_url.rstrip("/")
    signed_ttl = settings.screenshot_signed_url_ttl_seconds
    output = []
    for row in rows:
        expires_unix = int((datetime.now(UTC) + timedelta(seconds=signed_ttl)).timestamp())
        token = generate_screenshot_token(row["screenshot_id"], expires_unix)
        output.append(
            {
                "screenshot_id": row["screenshot_id"],
                "session_id": row["session_id"],
                "screen": row["screen"],
                "signed_url": f"{base}/screenshots/file/{row['screenshot_id']}?token={token}",
                "content_type": row["content_type"],
                "width": row["width"],
                "height": row["height"],
                "byte_size": int(row["byte_size"]),
                "uploaded_at": row["uploaded_at"].isoformat(),
                "expires_at": row["expires_at"].isoformat(),
            }
        )
    return output


def resolve_screenshot_file(db: Session, screenshot_id: str) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT id::text AS screenshot_id, object_key, content_type, expires_at
            FROM screenshot_assets
            WHERE id = CAST(:screenshot_id AS uuid)
            LIMIT 1
            """
        ),
        {"screenshot_id": screenshot_id},
    ).mappings().one_or_none()
    if row is None:
        return None
    if row["expires_at"] <= datetime.now(UTC):
        return None
    file_path = _screenshot_storage_root() / row["object_key"]
    if not file_path.exists():
        return None
    return {"content_type": row["content_type"], "file_path": str(file_path)}
