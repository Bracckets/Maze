from __future__ import annotations

import json
import re
from collections import OrderedDict
from datetime import UTC, datetime
from hashlib import sha256
from typing import Any
from uuid import uuid4

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.liquid.resolver import BundleEntry, ResolutionContext, VariantCandidate, resolve_bundle_items
from app.liquid.schemas import LiquidContentPayload

RUNTIME_TTL_SECONDS = 60


def get_liquid_overview(db: Session, workspace_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*)::int FROM liquid_keys WHERE workspace_id = CAST(:workspace_id AS uuid)) AS key_count,
                (SELECT COUNT(*)::int FROM liquid_screen_bundles WHERE workspace_id = CAST(:workspace_id AS uuid)) AS bundle_count,
                (SELECT COUNT(*)::int FROM liquid_keys WHERE workspace_id = CAST(:workspace_id AS uuid) AND published_revision > 0) AS published_key_count,
                (SELECT COUNT(*)::int FROM liquid_screen_bundles WHERE workspace_id = CAST(:workspace_id AS uuid) AND published_revision > 0) AS published_bundle_count,
                (SELECT COUNT(*)::int FROM liquid_segments WHERE workspace_id = CAST(:workspace_id AS uuid)) AS segment_count,
                (SELECT COUNT(*)::int FROM liquid_experiments WHERE workspace_id = CAST(:workspace_id AS uuid) AND status = 'active') AS active_experiment_count
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().one()
    return {
        "keyCount": row["key_count"],
        "bundleCount": row["bundle_count"],
        "publishedKeyCount": row["published_key_count"],
        "publishedBundleCount": row["published_bundle_count"],
        "segmentCount": row["segment_count"],
        "activeExperimentCount": row["active_experiment_count"],
        "runtimePath": "/liquid/runtime/bundles/resolve",
        "cachePolicy": f"private, max-age={RUNTIME_TTL_SECONDS}, stale-while-revalidate=300",
    }


def list_liquid_keys(db: Session, workspace_id: str, query: str | None = None) -> list[dict[str, Any]]:
    search = f"%{query.strip()}%" if query and query.strip() else None
    base_sql = """
        SELECT
            lk.id::text AS id,
            lk.key_name AS key,
            lk.label,
            lk.description,
            lk.namespace,
            lk.default_locale AS default_locale,
            lk.enabled,
            lk.published_revision,
            lk.published_at,
            lk.updated_at,
            COALESCE(draft_variants.variant_count, 0)::int AS draft_variant_count,
            COALESCE(published_variants.variant_count, 0)::int AS published_variant_count,
            COALESCE(bundle_refs.bundle_count, 0)::int AS bundle_count
        FROM liquid_keys lk
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS variant_count
            FROM liquid_variants lv
            WHERE lv.key_id = lk.id
              AND lv.stage = 'draft'
        ) draft_variants ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS variant_count
            FROM liquid_variants lv
            WHERE lv.key_id = lk.id
              AND lv.stage = 'published'
        ) published_variants ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT bundle_id)::int AS bundle_count
            FROM liquid_screen_bundle_mappings lsbm
            WHERE lsbm.key_id = lk.id
              AND lsbm.stage = 'draft'
        ) bundle_refs ON true
        WHERE lk.workspace_id = CAST(:workspace_id AS uuid)
    """
    if search:
        base_sql += """
          AND (
            lk.key_name ILIKE :search
            OR lk.label ILIKE :search
            OR COALESCE(lk.description, '') ILIKE :search
          )
        """
    base_sql += "\n        ORDER BY lk.updated_at DESC, lk.key_name ASC\n    "

    params: dict[str, Any] = {"workspace_id": workspace_id}
    if search:
        params["search"] = search

    rows = db.execute(text(base_sql), params).mappings().all()
    return [
        {
            "id": row["id"],
            "key": row["key"],
            "label": row["label"],
            "description": row["description"],
            "namespace": row["namespace"],
            "defaultLocale": row["default_locale"],
            "enabled": row["enabled"],
            "draftVariantCount": row["draft_variant_count"],
            "publishedVariantCount": row["published_variant_count"],
            "bundleCount": row["bundle_count"],
            "publishedRevision": row["published_revision"],
            "publishedAt": row["published_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_key(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_keys (
                workspace_id,
                key_name,
                label,
                description,
                namespace,
                default_locale,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :key_name,
                :label,
                :description,
                :namespace,
                :default_locale,
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "key_name": payload["key"],
            "label": payload["label"],
            "description": payload.get("description"),
            "namespace": payload.get("namespace"),
            "default_locale": payload["defaultLocale"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    db.execute(
        text(
            """
            INSERT INTO liquid_variants (
                workspace_id,
                key_id,
                stage,
                locale,
                content,
                priority,
                is_default,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                CAST(:key_id AS uuid),
                'draft',
                :locale,
                CAST(:content AS jsonb),
                100,
                true,
                true,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            """
        ),
        {
            "workspace_id": workspace_id,
            "key_id": row["id"],
            "locale": payload["defaultLocale"],
            "content": _json_dump(payload["initialContent"]),
            "user_id": user_id,
        },
    )
    if payload.get("screenKey"):
        _assign_key_to_screen(db, workspace_id, user_id, row["id"], payload["screenKey"])
    db.commit()
    return get_liquid_key_detail(db, workspace_id, row["id"])


def get_liquid_key_detail(db: Session, workspace_id: str, key_id: str) -> dict[str, Any]:
    key_row = db.execute(
        text(
            """
            SELECT
                id::text AS id,
                key_name AS key,
                label,
                description,
                namespace,
                default_locale AS default_locale,
                enabled,
                published_revision,
                published_at,
                draft_updated_at
            FROM liquid_keys
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    ).mappings().one_or_none()
    if key_row is None:
        raise LookupError("Liquid key not found.")

    variant_rows = db.execute(
        text(
            """
            SELECT
                lv.id::text AS id,
                lv.stage,
                lv.locale,
                lv.content,
                lv.segment_id::text AS segment_id,
                ls.segment_key,
                lv.rule_id::text AS rule_id,
                lr.rule_key,
                lv.experiment_id::text AS experiment_id,
                le.experiment_key,
                lv.experiment_arm,
                lv.traffic_percentage,
                lv.priority,
                lv.is_default,
                lv.enabled,
                lv.updated_at
            FROM liquid_variants lv
            LEFT JOIN liquid_segments ls ON ls.id = lv.segment_id
            LEFT JOIN liquid_rules lr ON lr.id = lv.rule_id
            LEFT JOIN liquid_experiments le ON le.id = lv.experiment_id
            WHERE lv.workspace_id = CAST(:workspace_id AS uuid)
              AND lv.key_id = CAST(:key_id AS uuid)
            ORDER BY CASE lv.stage WHEN 'draft' THEN 0 ELSE 1 END, lv.priority DESC, lv.created_at ASC
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    ).mappings().all()

    bundle_rows = db.execute(
        text(
            """
            SELECT
                b.id::text AS id,
                b.screen_key,
                b.label,
                m.order_index,
                m.enabled
            FROM liquid_screen_bundle_mappings m
            JOIN liquid_screen_bundles b ON b.id = m.bundle_id
            WHERE m.workspace_id = CAST(:workspace_id AS uuid)
              AND m.key_id = CAST(:key_id AS uuid)
              AND m.stage = 'draft'
            ORDER BY b.screen_key ASC, m.order_index ASC
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    ).mappings().all()

    return {
        "id": key_row["id"],
        "key": key_row["key"],
        "label": key_row["label"],
        "description": key_row["description"],
        "namespace": key_row["namespace"],
        "defaultLocale": key_row["default_locale"],
        "enabled": key_row["enabled"],
        "publishedRevision": key_row["published_revision"],
        "publishedAt": key_row["published_at"],
        "draftUpdatedAt": key_row["draft_updated_at"],
        "variants": [_variant_out(row) for row in variant_rows],
        "bundles": [
            {
                "id": row["id"],
                "screenKey": row["screen_key"],
                "label": row["label"],
                "orderIndex": row["order_index"],
                "enabled": row["enabled"],
            }
            for row in bundle_rows
        ],
    }


def update_liquid_key_draft(db: Session, workspace_id: str, user_id: str | None, key_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    updated = db.execute(
        text(
            """
            UPDATE liquid_keys
            SET
                key_name = :key_name,
                label = :label,
                description = :description,
                namespace = :namespace,
                default_locale = :default_locale,
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now(),
                draft_updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "key_id": key_id,
            "key_name": payload["key"],
            "label": payload["label"],
            "description": payload.get("description"),
            "namespace": payload.get("namespace"),
            "default_locale": payload["defaultLocale"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if updated is None:
        raise LookupError("Liquid key not found.")
    if payload.get("screenKey"):
        _assign_key_to_screen(db, workspace_id, user_id, key_id, payload["screenKey"])
    db.commit()
    return get_liquid_key_detail(db, workspace_id, key_id)


def publish_liquid_key(db: Session, workspace_id: str, user_id: str | None, key_id: str) -> dict[str, Any]:
    exists = _resource_exists(db, "liquid_keys", workspace_id, key_id)
    if not exists:
        raise LookupError("Liquid key not found.")
    draft_count = db.execute(
        text(
            """
            SELECT COUNT(*)::int
            FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'draft'
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    ).scalar_one()
    if draft_count <= 0:
        raise ValueError("Liquid key has no draft variants to publish.")

    db.execute(
        text(
            """
            DELETE FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'published'
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    )
    affected_bundle_ids = _replace_key_bundle_stage(
        db,
        workspace_id,
        key_id,
        source_stage="draft",
        target_stage="published",
    )
    db.execute(
        text(
            """
            INSERT INTO liquid_variants (
                workspace_id,
                key_id,
                stage,
                locale,
                content,
                segment_id,
                rule_id,
                experiment_id,
                experiment_arm,
                traffic_percentage,
                priority,
                is_default,
                enabled,
                created_by,
                updated_by,
                created_at,
                updated_at
            )
            SELECT
                workspace_id,
                key_id,
                'published',
                locale,
                content,
                segment_id,
                rule_id,
                experiment_id,
                experiment_arm,
                traffic_percentage,
                priority,
                is_default,
                enabled,
                created_by,
                updated_by,
                created_at,
                now()
            FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'draft'
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET
                published_revision = published_revision + 1,
                published_at = now(),
                published_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "user_id": user_id},
    )
    if affected_bundle_ids:
        _touch_bundles_for_stage(db, workspace_id, affected_bundle_ids, user_id, stage="published")
    db.commit()
    return get_liquid_key_detail(db, workspace_id, key_id)


def demote_liquid_key(db: Session, workspace_id: str, user_id: str | None, key_id: str) -> dict[str, Any]:
    _assert_workspace_resource(db, "liquid_keys", workspace_id, key_id, "Liquid key not found.")
    db.execute(
        text(
            """
            DELETE FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'published'
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    )
    affected_bundle_ids = _replace_key_bundle_stage(
        db,
        workspace_id,
        key_id,
        source_stage="draft",
        target_stage="published",
        clear_only=True,
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET
                published_revision = 0,
                published_at = NULL,
                published_by = NULL,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "user_id": user_id},
    )
    if affected_bundle_ids:
        _touch_bundles_for_stage(db, workspace_id, affected_bundle_ids, user_id, stage="demoted")
    db.commit()
    return get_liquid_key_detail(db, workspace_id, key_id)


def delete_liquid_key(db: Session, workspace_id: str, key_id: str) -> None:
    deleted = db.execute(
        text(
            """
            DELETE FROM liquid_keys
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    ).mappings().one_or_none()
    if deleted is None:
        raise LookupError("Liquid key not found.")
    db.commit()


def create_liquid_variant(db: Session, workspace_id: str, user_id: str | None, key_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    _assert_workspace_resource(db, "liquid_keys", workspace_id, key_id, "Liquid key not found.")
    _assert_targeting_refs(db, workspace_id, payload)
    if payload.get("isDefault"):
        _clear_default_variant(db, workspace_id, key_id, payload.get("locale"), exclude_variant_id=None)

    db.execute(
        text(
            """
            INSERT INTO liquid_variants (
                workspace_id,
                key_id,
                stage,
                locale,
                content,
                segment_id,
                rule_id,
                experiment_id,
                experiment_arm,
                traffic_percentage,
                priority,
                is_default,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                CAST(:key_id AS uuid),
                'draft',
                :locale,
                CAST(:content AS jsonb),
                CAST(:segment_id AS uuid),
                CAST(:rule_id AS uuid),
                CAST(:experiment_id AS uuid),
                :experiment_arm,
                :traffic_percentage,
                :priority,
                :is_default,
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            """
        ),
        {
            "workspace_id": workspace_id,
            "key_id": key_id,
            "locale": payload.get("locale"),
            "content": _json_dump(payload["content"]),
            "segment_id": payload.get("segmentId"),
            "rule_id": payload.get("ruleId"),
            "experiment_id": payload.get("experimentId"),
            "experiment_arm": payload.get("experimentArm"),
            "traffic_percentage": payload["trafficPercentage"],
            "priority": payload["priority"],
            "is_default": payload["isDefault"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET draft_updated_at = now(), updated_at = now(), updated_by = CAST(:user_id AS uuid)
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "user_id": user_id},
    )
    db.commit()
    return get_liquid_key_detail(db, workspace_id, key_id)


def update_liquid_variant(db: Session, workspace_id: str, user_id: str | None, variant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    variant = db.execute(
        text(
            """
            SELECT id::text AS id, key_id::text AS key_id, stage
            FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:variant_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "variant_id": variant_id},
    ).mappings().one_or_none()
    if variant is None:
        raise LookupError("Liquid variant not found.")
    if variant["stage"] != "draft":
        raise ValueError("Only draft variants can be edited directly.")

    _assert_targeting_refs(db, workspace_id, payload)
    if payload.get("isDefault"):
        _clear_default_variant(db, workspace_id, variant["key_id"], payload.get("locale"), exclude_variant_id=variant_id)

    db.execute(
        text(
            """
            UPDATE liquid_variants
            SET
                locale = :locale,
                content = CAST(:content AS jsonb),
                segment_id = CAST(:segment_id AS uuid),
                rule_id = CAST(:rule_id AS uuid),
                experiment_id = CAST(:experiment_id AS uuid),
                experiment_arm = :experiment_arm,
                traffic_percentage = :traffic_percentage,
                priority = :priority,
                is_default = :is_default,
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE id = CAST(:variant_id AS uuid)
            """
        ),
        {
            "variant_id": variant_id,
            "locale": payload.get("locale"),
            "content": _json_dump(payload["content"]),
            "segment_id": payload.get("segmentId"),
            "rule_id": payload.get("ruleId"),
            "experiment_id": payload.get("experimentId"),
            "experiment_arm": payload.get("experimentArm"),
            "traffic_percentage": payload["trafficPercentage"],
            "priority": payload["priority"],
            "is_default": payload["isDefault"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET draft_updated_at = now(), updated_at = now(), updated_by = CAST(:user_id AS uuid)
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": variant["key_id"], "user_id": user_id},
    )
    db.commit()
    return get_liquid_key_detail(db, workspace_id, variant["key_id"])


def delete_liquid_variant(db: Session, workspace_id: str, variant_id: str) -> dict[str, Any]:
    variant = db.execute(
        text(
            """
            SELECT id::text AS id, key_id::text AS key_id, stage
            FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:variant_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "variant_id": variant_id},
    ).mappings().one_or_none()
    if variant is None:
        raise LookupError("Liquid variant not found.")
    if variant["stage"] != "draft":
        raise ValueError("Only draft variants can be deleted directly.")

    db.execute(
        text(
            """
            DELETE FROM liquid_variants
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:variant_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "variant_id": variant_id},
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET draft_updated_at = now(), updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": variant["key_id"]},
    )
    db.commit()
    return get_liquid_key_detail(db, workspace_id, variant["key_id"])


def list_liquid_segments(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, segment_key, name, description, conditions, enabled, updated_at
            FROM liquid_segments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY updated_at DESC, segment_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "segmentKey": row["segment_key"],
            "name": row["name"],
            "description": row["description"],
            "conditions": _condition_group(row["conditions"]),
            "enabled": row["enabled"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_segment(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_segments (
                workspace_id,
                segment_key,
                name,
                description,
                conditions,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :segment_key,
                :name,
                :description,
                CAST(:conditions AS jsonb),
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "segment_key": payload["segmentKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(payload["conditions"]),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    db.commit()
    return get_liquid_segment(db, workspace_id, row["id"])


def update_liquid_segment(db: Session, workspace_id: str, user_id: str | None, segment_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            UPDATE liquid_segments
            SET
                segment_key = :segment_key,
                name = :name,
                description = :description,
                conditions = CAST(:conditions AS jsonb),
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:segment_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "segment_id": segment_id,
            "segment_key": payload["segmentKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(payload["conditions"]),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid segment not found.")
    db.commit()
    return get_liquid_segment(db, workspace_id, segment_id)


def get_liquid_segment(db: Session, workspace_id: str, segment_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, segment_key, name, description, conditions, enabled, updated_at
            FROM liquid_segments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:segment_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "segment_id": segment_id},
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid segment not found.")
    return {
        "id": row["id"],
        "segmentKey": row["segment_key"],
        "name": row["name"],
        "description": row["description"],
        "conditions": _condition_group(row["conditions"]),
        "enabled": row["enabled"],
        "updatedAt": row["updated_at"],
    }


def list_liquid_traits(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, trait_key, label, description, value_type, enabled, updated_at
            FROM liquid_profile_traits
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY updated_at DESC, trait_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "traitKey": row["trait_key"],
            "label": row["label"],
            "description": row["description"],
            "valueType": row["value_type"],
            "enabled": row["enabled"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_trait(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_profile_traits (
                workspace_id,
                trait_key,
                label,
                description,
                value_type,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :trait_key,
                :label,
                :description,
                :value_type,
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "trait_key": payload["traitKey"],
            "label": payload["label"],
            "description": payload.get("description"),
            "value_type": payload.get("valueType", "text"),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    db.commit()
    return get_liquid_trait(db, workspace_id, row["id"])


def update_liquid_trait(db: Session, workspace_id: str, user_id: str | None, trait_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            UPDATE liquid_profile_traits
            SET
                trait_key = :trait_key,
                label = :label,
                description = :description,
                value_type = :value_type,
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:trait_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "trait_id": trait_id,
            "trait_key": payload["traitKey"],
            "label": payload["label"],
            "description": payload.get("description"),
            "value_type": payload.get("valueType", "text"),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid trait not found.")
    db.commit()
    return get_liquid_trait(db, workspace_id, trait_id)


def get_liquid_trait(db: Session, workspace_id: str, trait_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, trait_key, label, description, value_type, enabled, updated_at
            FROM liquid_profile_traits
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:trait_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "trait_id": trait_id},
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid trait not found.")
    return {
        "id": row["id"],
        "traitKey": row["trait_key"],
        "label": row["label"],
        "description": row["description"],
        "valueType": row["value_type"],
        "enabled": row["enabled"],
        "updatedAt": row["updated_at"],
    }


def delete_liquid_trait(db: Session, workspace_id: str, trait_id: str) -> None:
    deleted = db.execute(
        text(
            """
            DELETE FROM liquid_profile_traits
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:trait_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {"workspace_id": workspace_id, "trait_id": trait_id},
    ).mappings().one_or_none()
    if deleted is None:
        raise LookupError("Liquid trait not found.")
    db.commit()


def list_liquid_profiles(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    trait_map = _trait_definition_map(db, workspace_id)
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, segment_key, name, description, conditions, enabled, updated_at
            FROM liquid_segments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY updated_at DESC, segment_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [_profile_out(row, trait_map) for row in rows]


def create_liquid_profile(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    conditions = _profile_conditions(payload.get("traits", []), _trait_definition_map(db, workspace_id))
    row = db.execute(
        text(
            """
            INSERT INTO liquid_segments (
                workspace_id,
                segment_key,
                name,
                description,
                conditions,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :segment_key,
                :name,
                :description,
                CAST(:conditions AS jsonb),
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "segment_key": payload["profileKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(conditions),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    db.commit()
    return get_liquid_profile(db, workspace_id, row["id"])


def update_liquid_profile(db: Session, workspace_id: str, user_id: str | None, profile_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    conditions = _profile_conditions(payload.get("traits", []), _trait_definition_map(db, workspace_id))
    row = db.execute(
        text(
            """
            UPDATE liquid_segments
            SET
                segment_key = :segment_key,
                name = :name,
                description = :description,
                conditions = CAST(:conditions AS jsonb),
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:profile_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "profile_id": profile_id,
            "segment_key": payload["profileKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(conditions),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid profile not found.")
    db.commit()
    return get_liquid_profile(db, workspace_id, profile_id)


def get_liquid_profile(db: Session, workspace_id: str, profile_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, segment_key, name, description, conditions, enabled, updated_at
            FROM liquid_segments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:profile_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "profile_id": profile_id},
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid profile not found.")
    return _profile_out(row, _trait_definition_map(db, workspace_id))


def delete_liquid_profile(db: Session, workspace_id: str, profile_id: str) -> None:
    deleted = db.execute(
        text(
            """
            DELETE FROM liquid_segments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:profile_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {"workspace_id": workspace_id, "profile_id": profile_id},
    ).mappings().one_or_none()
    if deleted is None:
        raise LookupError("Liquid profile not found.")
    db.commit()


def list_liquid_rules(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, rule_key, name, description, conditions, priority, enabled, updated_at
            FROM liquid_rules
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY priority DESC, updated_at DESC, rule_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "ruleKey": row["rule_key"],
            "name": row["name"],
            "description": row["description"],
            "conditions": _condition_group(row["conditions"]),
            "priority": row["priority"],
            "enabled": row["enabled"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_rule(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_rules (
                workspace_id,
                rule_key,
                name,
                description,
                conditions,
                priority,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :rule_key,
                :name,
                :description,
                CAST(:conditions AS jsonb),
                :priority,
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "rule_key": payload["ruleKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(payload["conditions"]),
            "priority": payload["priority"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    db.commit()
    return get_liquid_rule(db, workspace_id, row["id"])


def update_liquid_rule(db: Session, workspace_id: str, user_id: str | None, rule_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            UPDATE liquid_rules
            SET
                rule_key = :rule_key,
                name = :name,
                description = :description,
                conditions = CAST(:conditions AS jsonb),
                priority = :priority,
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:rule_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "rule_id": rule_id,
            "rule_key": payload["ruleKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "conditions": _json_dump(payload["conditions"]),
            "priority": payload["priority"],
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid rule not found.")
    db.commit()
    return get_liquid_rule(db, workspace_id, rule_id)


def get_liquid_rule(db: Session, workspace_id: str, rule_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, rule_key, name, description, conditions, priority, enabled, updated_at
            FROM liquid_rules
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:rule_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "rule_id": rule_id},
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid rule not found.")
    return {
        "id": row["id"],
        "ruleKey": row["rule_key"],
        "name": row["name"],
        "description": row["description"],
        "conditions": _condition_group(row["conditions"]),
        "priority": row["priority"],
        "enabled": row["enabled"],
        "updatedAt": row["updated_at"],
    }


def list_liquid_experiments(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, experiment_key, name, description, status, traffic_allocation, seed, updated_at
            FROM liquid_experiments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY updated_at DESC, experiment_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "experimentKey": row["experiment_key"],
            "name": row["name"],
            "description": row["description"],
            "status": row["status"],
            "trafficAllocation": row["traffic_allocation"],
            "seed": row["seed"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_experiment(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_experiments (
                workspace_id,
                experiment_key,
                name,
                description,
                status,
                traffic_allocation,
                seed,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :experiment_key,
                :name,
                :description,
                :status,
                :traffic_allocation,
                :seed,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "experiment_key": payload["experimentKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "status": payload["status"],
            "traffic_allocation": payload["trafficAllocation"],
            "seed": f"exp_{uuid4().hex[:12]}",
            "user_id": user_id,
        },
    ).mappings().one()
    db.commit()
    return get_liquid_experiment(db, workspace_id, row["id"])


def update_liquid_experiment(db: Session, workspace_id: str, user_id: str | None, experiment_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            UPDATE liquid_experiments
            SET
                experiment_key = :experiment_key,
                name = :name,
                description = :description,
                status = :status,
                traffic_allocation = :traffic_allocation,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:experiment_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "experiment_id": experiment_id,
            "experiment_key": payload["experimentKey"],
            "name": payload["name"],
            "description": payload.get("description"),
            "status": payload["status"],
            "traffic_allocation": payload["trafficAllocation"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid experiment not found.")
    db.commit()
    return get_liquid_experiment(db, workspace_id, experiment_id)


def get_liquid_experiment(db: Session, workspace_id: str, experiment_id: str) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, experiment_key, name, description, status, traffic_allocation, seed, updated_at
            FROM liquid_experiments
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:experiment_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "experiment_id": experiment_id},
    ).mappings().one_or_none()
    if row is None:
        raise LookupError("Liquid experiment not found.")
    return {
        "id": row["id"],
        "experimentKey": row["experiment_key"],
        "name": row["name"],
        "description": row["description"],
        "status": row["status"],
        "trafficAllocation": row["traffic_allocation"],
        "seed": row["seed"],
        "updatedAt": row["updated_at"],
    }


def list_liquid_bundles(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT
                b.id::text AS id,
                b.screen_key,
                b.label,
                b.description,
                b.enabled,
                b.published_revision,
                b.published_at,
                b.updated_at,
                COALESCE(draft_items.item_count, 0)::int AS draft_item_count,
                COALESCE(published_items.item_count, 0)::int AS published_item_count
            FROM liquid_screen_bundles b
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS item_count
                FROM liquid_screen_bundle_mappings m
                WHERE m.bundle_id = b.id
                  AND m.stage = 'draft'
            ) draft_items ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS item_count
                FROM liquid_screen_bundle_mappings m
                WHERE m.bundle_id = b.id
                  AND m.stage = 'published'
            ) published_items ON true
            WHERE b.workspace_id = CAST(:workspace_id AS uuid)
            ORDER BY b.updated_at DESC, b.screen_key ASC
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "screenKey": row["screen_key"],
            "label": row["label"],
            "description": row["description"],
            "enabled": row["enabled"],
            "draftKeyCount": row["draft_item_count"],
            "publishedKeyCount": row["published_item_count"],
            "publishedRevision": row["published_revision"],
            "publishedAt": row["published_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def create_liquid_bundle(db: Session, workspace_id: str, user_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO liquid_screen_bundles (
                workspace_id,
                screen_key,
                label,
                description,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :screen_key,
                :label,
                :description,
                :enabled,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "screen_key": payload["screenKey"],
            "label": payload["label"],
            "description": payload.get("description"),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one()
    _replace_bundle_items(db, workspace_id, row["id"], payload["items"], stage="draft")
    db.commit()
    return get_liquid_bundle_detail(db, workspace_id, row["id"])


def get_liquid_bundle_detail(db: Session, workspace_id: str, bundle_id: str) -> dict[str, Any]:
    bundle_row = db.execute(
        text(
            """
            SELECT
                id::text AS id,
                screen_key,
                label,
                description,
                enabled,
                published_revision,
                published_at,
                updated_at
            FROM liquid_screen_bundles
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:bundle_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id},
    ).mappings().one_or_none()
    if bundle_row is None:
        raise LookupError("Liquid bundle not found.")

    item_rows = db.execute(
        text(
            """
            SELECT
                m.stage,
                m.key_id::text AS key_id,
                k.key_name AS key_name,
                k.label,
                m.order_index,
                m.enabled
            FROM liquid_screen_bundle_mappings m
            JOIN liquid_keys k ON k.id = m.key_id
            WHERE m.workspace_id = CAST(:workspace_id AS uuid)
              AND m.bundle_id = CAST(:bundle_id AS uuid)
            ORDER BY CASE m.stage WHEN 'draft' THEN 0 ELSE 1 END, m.order_index ASC, k.key_name ASC
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id},
    ).mappings().all()

    draft_items = []
    published_items = []
    for row in item_rows:
        item = {
            "keyId": row["key_id"],
            "key": row["key_name"],
            "label": row["label"],
            "orderIndex": row["order_index"],
            "enabled": row["enabled"],
        }
        if row["stage"] == "draft":
            draft_items.append(item)
        else:
            published_items.append(item)

    return {
        "id": bundle_row["id"],
        "screenKey": bundle_row["screen_key"],
        "label": bundle_row["label"],
        "description": bundle_row["description"],
        "enabled": bundle_row["enabled"],
        "publishedRevision": bundle_row["published_revision"],
        "publishedAt": bundle_row["published_at"],
        "draftItems": draft_items,
        "publishedItems": published_items,
        "updatedAt": bundle_row["updated_at"],
    }


def update_liquid_bundle(db: Session, workspace_id: str, user_id: str | None, bundle_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    updated = db.execute(
        text(
            """
            UPDATE liquid_screen_bundles
            SET
                screen_key = :screen_key,
                label = :label,
                description = :description,
                enabled = :enabled,
                updated_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:bundle_id AS uuid)
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "bundle_id": bundle_id,
            "screen_key": payload["screenKey"],
            "label": payload["label"],
            "description": payload.get("description"),
            "enabled": payload["enabled"],
            "user_id": user_id,
        },
    ).mappings().one_or_none()
    if updated is None:
        raise LookupError("Liquid bundle not found.")
    _replace_bundle_items(db, workspace_id, bundle_id, payload["items"], stage="draft")
    db.commit()
    return get_liquid_bundle_detail(db, workspace_id, bundle_id)


def publish_liquid_bundle(db: Session, workspace_id: str, user_id: str | None, bundle_id: str) -> dict[str, Any]:
    _assert_workspace_resource(db, "liquid_screen_bundles", workspace_id, bundle_id, "Liquid bundle not found.")
    db.execute(
        text(
            """
            DELETE FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND bundle_id = CAST(:bundle_id AS uuid)
              AND stage = 'published'
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id},
    )
    db.execute(
        text(
            """
            INSERT INTO liquid_screen_bundle_mappings (
                workspace_id,
                bundle_id,
                key_id,
                stage,
                order_index,
                enabled,
                created_at,
                updated_at
            )
            SELECT
                workspace_id,
                bundle_id,
                key_id,
                'published',
                order_index,
                enabled,
                created_at,
                now()
            FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND bundle_id = CAST(:bundle_id AS uuid)
              AND stage = 'draft'
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id},
    )
    db.execute(
        text(
            """
            UPDATE liquid_screen_bundles
            SET
                published_revision = published_revision + 1,
                published_at = now(),
                published_by = CAST(:user_id AS uuid),
                updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:bundle_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id, "user_id": user_id},
    )
    db.commit()
    return get_liquid_bundle_detail(db, workspace_id, bundle_id)


def resolve_liquid_bundle(
    db: Session,
    workspace_id: str,
    screen_key: str,
    request: dict[str, Any],
    stage: str,
) -> dict[str, Any]:
    bundle = db.execute(
        text(
            f"""
            SELECT
                id::text AS id,
                screen_key,
                enabled,
                published_revision,
                updated_at
            FROM liquid_screen_bundles
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND screen_key = :screen_key
              {"AND enabled = true" if stage == "published" else ""}
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "screen_key": screen_key},
    ).mappings().one_or_none()
    if bundle is None:
        raise LookupError("Liquid bundle not found.")

    rows = db.execute(
        text(
            """
            SELECT
                m.order_index,
                k.id::text AS key_id,
                k.key_name,
                k.default_locale,
                v.id::text AS variant_id,
                v.locale,
                v.content,
                v.traffic_percentage,
                v.priority,
                v.is_default,
                v.enabled AS variant_enabled,
                ls.segment_key,
                COALESCE(ls.enabled, true) AS segment_enabled,
                COALESCE(ls.conditions, '{"all":[],"any":[]}'::jsonb) AS segment_conditions,
                lr.rule_key,
                COALESCE(lr.enabled, true) AS rule_enabled,
                COALESCE(lr.conditions, '{"all":[],"any":[]}'::jsonb) AS rule_conditions,
                le.experiment_key,
                le.status AS experiment_status,
                le.seed AS experiment_seed,
                COALESCE(le.traffic_allocation, 100) AS experiment_traffic_allocation,
                v.experiment_arm
            FROM liquid_screen_bundle_mappings m
            JOIN liquid_keys k
              ON k.id = m.key_id
             AND k.workspace_id = CAST(:workspace_id AS uuid)
             AND k.enabled = true
            LEFT JOIN liquid_variants v
              ON v.key_id = m.key_id
             AND v.workspace_id = CAST(:workspace_id AS uuid)
             AND v.stage = :stage
            LEFT JOIN liquid_segments ls ON ls.id = v.segment_id
            LEFT JOIN liquid_rules lr ON lr.id = v.rule_id
            LEFT JOIN liquid_experiments le ON le.id = v.experiment_id
            WHERE m.workspace_id = CAST(:workspace_id AS uuid)
              AND m.bundle_id = CAST(:bundle_id AS uuid)
              AND m.stage = :stage
              AND m.enabled = true
            ORDER BY m.order_index ASC, k.key_name ASC, v.priority DESC, v.created_at ASC
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle["id"], "stage": stage},
    ).mappings().all()

    entries: "OrderedDict[str, BundleEntry]" = OrderedDict()
    for row in rows:
        if row["key_id"] not in entries:
            entries[row["key_id"]] = BundleEntry(
                key=row["key_name"],
                default_locale=row["default_locale"],
                order_index=row["order_index"],
                variants=[],
            )
        if row["variant_id"] is None:
            continue
        entries[row["key_id"]].variants.append(
            VariantCandidate(
                id=row["variant_id"],
                locale=row["locale"],
                content=_content_payload(row["content"]),
                segment_key=row["segment_key"],
                segment_enabled=row["segment_enabled"],
                segment_conditions=_condition_group(row["segment_conditions"]),
                rule_key=row["rule_key"],
                rule_enabled=row["rule_enabled"],
                rule_conditions=_condition_group(row["rule_conditions"]),
                experiment_key=row["experiment_key"],
                experiment_status=row["experiment_status"],
                experiment_seed=row["experiment_seed"],
                experiment_arm=row["experiment_arm"],
                experiment_traffic_allocation=row["experiment_traffic_allocation"],
                traffic_percentage=row["traffic_percentage"],
                priority=row["priority"],
                is_default=row["is_default"],
                enabled=row["variant_enabled"],
            )
        )

    context = ResolutionContext(
        locale=request.get("locale"),
        subject_id=request.get("subjectId"),
        platform=request.get("platform"),
        app_version=request.get("appVersion"),
        country=request.get("country"),
        traits=request.get("traits") or {},
    )
    items = resolve_bundle_items(list(entries.values()), context)
    generated_at = datetime.now(UTC)
    revision = bundle["published_revision"] if stage == "published" else bundle["published_revision"] + 1
    etag_input = _json_dump({"screenKey": bundle["screen_key"], "stage": stage, "revision": revision, "items": items})
    return {
        "screenKey": bundle["screen_key"],
        "stage": stage,
        "revision": revision,
        "etag": sha256(etag_input.encode("utf-8")).hexdigest()[:16],
        "ttlSeconds": RUNTIME_TTL_SECONDS if stage == "published" else 0,
        "generatedAt": generated_at,
        "items": items,
    }


def _assign_key_to_screen(db: Session, workspace_id: str, user_id: str | None, key_id: str, screen_key: str) -> None:
    normalized_screen_key = screen_key.strip()
    if not normalized_screen_key:
        raise ValueError("screenKey is required.")
    bundle_id = _ensure_bundle_for_screen(db, workspace_id, user_id, normalized_screen_key)
    db.execute(
        text(
            """
            DELETE FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'draft'
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id},
    )
    next_order = db.execute(
        text(
            """
            SELECT COALESCE(MAX(order_index), -1) + 1
            FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND bundle_id = CAST(:bundle_id AS uuid)
              AND stage = 'draft'
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id},
    ).scalar_one()
    db.execute(
        text(
            """
            INSERT INTO liquid_screen_bundle_mappings (
                workspace_id,
                bundle_id,
                key_id,
                stage,
                order_index,
                enabled
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                CAST(:bundle_id AS uuid),
                CAST(:key_id AS uuid),
                'draft',
                :order_index,
                true
            )
            """
        ),
        {
            "workspace_id": workspace_id,
            "bundle_id": bundle_id,
            "key_id": key_id,
            "order_index": next_order,
        },
    )
    db.execute(
        text(
            """
            UPDATE liquid_keys
            SET draft_updated_at = now(), updated_at = now(), updated_by = CAST(:user_id AS uuid)
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:key_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "user_id": user_id},
    )


def _ensure_bundle_for_screen(db: Session, workspace_id: str, user_id: str | None, screen_key: str) -> str:
    existing = db.execute(
        text(
            """
            SELECT id::text AS id
            FROM liquid_screen_bundles
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND screen_key = :screen_key
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "screen_key": screen_key},
    ).mappings().one_or_none()
    if existing is not None:
        return existing["id"]
    created = db.execute(
        text(
            """
            INSERT INTO liquid_screen_bundles (
                workspace_id,
                screen_key,
                label,
                enabled,
                created_by,
                updated_by
            )
            VALUES (
                CAST(:workspace_id AS uuid),
                :screen_key,
                :label,
                true,
                CAST(:user_id AS uuid),
                CAST(:user_id AS uuid)
            )
            RETURNING id::text AS id
            """
        ),
        {
            "workspace_id": workspace_id,
            "screen_key": screen_key,
            "label": _screen_label(screen_key),
            "user_id": user_id,
        },
    ).mappings().one()
    return created["id"]


def _replace_key_bundle_stage(
    db: Session,
    workspace_id: str,
    key_id: str,
    source_stage: str,
    target_stage: str,
    clear_only: bool = False,
) -> list[str]:
    affected_bundle_ids = _bundle_ids_for_key(db, workspace_id, key_id, source_stage) + _bundle_ids_for_key(db, workspace_id, key_id, target_stage)
    db.execute(
        text(
            """
            DELETE FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = :target_stage
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "target_stage": target_stage},
    )
    if not clear_only:
        db.execute(
            text(
                """
                INSERT INTO liquid_screen_bundle_mappings (
                    workspace_id,
                    bundle_id,
                    key_id,
                    stage,
                    order_index,
                    enabled,
                    created_at,
                    updated_at
                )
                SELECT
                    workspace_id,
                    bundle_id,
                    key_id,
                    :target_stage,
                    order_index,
                    enabled,
                    created_at,
                    now()
                FROM liquid_screen_bundle_mappings
                WHERE workspace_id = CAST(:workspace_id AS uuid)
                  AND key_id = CAST(:key_id AS uuid)
                  AND stage = :source_stage
                """
            ),
            {
                "workspace_id": workspace_id,
                "key_id": key_id,
                "source_stage": source_stage,
                "target_stage": target_stage,
            },
        )
    return list(dict.fromkeys(affected_bundle_ids))


def _bundle_ids_for_key(db: Session, workspace_id: str, key_id: str, stage: str) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT bundle_id::text AS bundle_id
            FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = :stage
            """
        ),
        {"workspace_id": workspace_id, "key_id": key_id, "stage": stage},
    ).mappings().all()
    return [row["bundle_id"] for row in rows]


def _touch_bundles_for_stage(
    db: Session,
    workspace_id: str,
    bundle_ids: list[str],
    user_id: str | None,
    stage: str,
) -> None:
    if not bundle_ids:
        return
    query = text(
        """
        UPDATE liquid_screen_bundles
        SET
            updated_at = now(),
            updated_by = CAST(:user_id AS uuid),
            published_revision = CASE
                WHEN :stage = 'published' THEN published_revision + 1
                WHEN :stage = 'demoted' AND EXISTS (
                    SELECT 1
                    FROM liquid_screen_bundle_mappings m
                    WHERE m.bundle_id = liquid_screen_bundles.id
                      AND m.stage = 'published'
                ) THEN published_revision
                WHEN :stage = 'demoted' THEN 0
                ELSE published_revision
            END,
            published_at = CASE
                WHEN :stage = 'published' THEN now()
                WHEN :stage = 'demoted' AND EXISTS (
                    SELECT 1
                    FROM liquid_screen_bundle_mappings m
                    WHERE m.bundle_id = liquid_screen_bundles.id
                      AND m.stage = 'published'
                ) THEN published_at
                WHEN :stage = 'demoted' THEN NULL
                ELSE published_at
            END,
            published_by = CASE
                WHEN :stage = 'published' THEN CAST(:user_id AS uuid)
                WHEN :stage = 'demoted' AND EXISTS (
                    SELECT 1
                    FROM liquid_screen_bundle_mappings m
                    WHERE m.bundle_id = liquid_screen_bundles.id
                      AND m.stage = 'published'
                ) THEN published_by
                WHEN :stage = 'demoted' THEN NULL
                ELSE published_by
            END
        WHERE workspace_id = CAST(:workspace_id AS uuid)
          AND id IN :bundle_ids
        """
    ).bindparams(bindparam("bundle_ids", expanding=True))
    db.execute(query, {"workspace_id": workspace_id, "bundle_ids": bundle_ids, "user_id": user_id, "stage": stage})


def _replace_bundle_items(
    db: Session,
    workspace_id: str,
    bundle_id: str,
    items: list[dict[str, Any]],
    stage: str,
) -> None:
    key_ids = [item["keyId"] for item in items]
    if key_ids:
        validation_query = text(
            """
            SELECT id::text AS id
            FROM liquid_keys
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id IN :key_ids
            """
        ).bindparams(bindparam("key_ids", expanding=True))
        valid_keys = db.execute(validation_query, {"workspace_id": workspace_id, "key_ids": key_ids}).mappings().all()
        if len(valid_keys) != len(set(key_ids)):
            raise ValueError("Bundle items must reference keys in the current workspace.")

    db.execute(
        text(
            """
            DELETE FROM liquid_screen_bundle_mappings
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND bundle_id = CAST(:bundle_id AS uuid)
              AND stage = :stage
            """
        ),
        {"workspace_id": workspace_id, "bundle_id": bundle_id, "stage": stage},
    )

    for item in items:
        db.execute(
            text(
                """
                INSERT INTO liquid_screen_bundle_mappings (
                    workspace_id,
                    bundle_id,
                    key_id,
                    stage,
                    order_index,
                    enabled
                )
                VALUES (
                    CAST(:workspace_id AS uuid),
                    CAST(:bundle_id AS uuid),
                    CAST(:key_id AS uuid),
                    :stage,
                    :order_index,
                    :enabled
                )
                """
            ),
            {
                "workspace_id": workspace_id,
                "bundle_id": bundle_id,
                "key_id": item["keyId"],
                "stage": stage,
                "order_index": item["orderIndex"],
                "enabled": item["enabled"],
            },
        )


def _trait_definition_map(db: Session, workspace_id: str) -> dict[str, dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id::text AS id, trait_key, label, description, value_type, enabled
            FROM liquid_profile_traits
            WHERE workspace_id = CAST(:workspace_id AS uuid)
            """
        ),
        {"workspace_id": workspace_id},
    ).mappings().all()
    return {
        row["trait_key"]: {
            "id": row["id"],
            "traitKey": row["trait_key"],
            "label": row["label"],
            "description": row["description"],
            "valueType": row["value_type"],
            "enabled": row["enabled"],
        }
        for row in rows
    }


def _profile_conditions(traits: list[dict[str, Any]], trait_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    conditions = []
    seen_trait_keys: set[str] = set()
    for trait in traits:
        trait_key = (trait.get("traitKey") or "").strip()
        if not trait_key:
            continue
        if trait_key in seen_trait_keys:
            raise ValueError("Each profile trait can only be used once.")
        if trait_key not in trait_map:
            raise ValueError(f"Trait '{trait_key}' must be created before it can be used in a profile.")
        value_type = str(trait_map[trait_key].get("valueType") or "text")
        seen_trait_keys.add(trait_key)
        if value_type in {"text", "select"}:
            value = str(trait.get("value") or "").strip()
            if not value:
                raise ValueError(f"Trait '{trait_map[trait_key]['label']}' needs a value.")
            conditions.append({"field": trait_key, "operator": "eq", "value": value})
            continue
        if value_type == "int":
            int_value = _coerce_profile_int(trait.get("intValue"), trait.get("value"), trait_map[trait_key]["label"])
            conditions.append({"field": trait_key, "operator": "eq", "value": int_value})
            continue
        if value_type == "boolean":
            bool_value = _coerce_profile_bool(trait.get("boolValue"), trait.get("value"), trait_map[trait_key]["label"])
            conditions.append({"field": trait_key, "operator": "eq", "value": bool_value})
            continue
        if value_type == "range":
            min_value, max_value = _coerce_profile_range(
                trait.get("minValue"),
                trait.get("maxValue"),
                trait_map[trait_key]["label"],
            )
            conditions.append({"field": trait_key, "operator": "gte", "value": min_value})
            conditions.append({"field": trait_key, "operator": "lte", "value": max_value})
            continue
        raise ValueError(f"Trait '{trait_map[trait_key]['label']}' has an unsupported value type.")
    return {"all": conditions, "any": []}


def _profile_out(row: dict[str, Any], trait_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    traits: list[dict[str, Any]] = []
    grouped_conditions: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    for condition in _condition_group(row["conditions"]).get("all", []):
        trait_key = str(condition.get("field") or "").strip()
        if not trait_key:
            continue
        grouped_conditions.setdefault(trait_key, []).append(condition)

    for trait_key, trait_conditions in grouped_conditions.items():
        definition = trait_map.get(trait_key)
        value_type = str(definition.get("valueType") if definition else _infer_profile_trait_value_type(trait_conditions))
        value: str | None = None
        int_value: int | None = None
        min_value: float | None = None
        max_value: float | None = None
        bool_value: bool | None = None

        if value_type in {"text", "select"}:
            first = next((condition for condition in trait_conditions if condition.get("operator") == "eq"), trait_conditions[0])
            raw_value = first.get("value")
            value = "" if raw_value is None else str(raw_value)
        elif value_type == "int":
            first = next((condition for condition in trait_conditions if condition.get("operator") == "eq"), trait_conditions[0])
            int_value = _normalize_int_value(first.get("value"))
        elif value_type == "boolean":
            first = next((condition for condition in trait_conditions if condition.get("operator") == "eq"), trait_conditions[0])
            bool_value = _normalize_bool_value(first.get("value"))
        elif value_type == "range":
            min_condition = next((condition for condition in trait_conditions if condition.get("operator") == "gte"), None)
            max_condition = next((condition for condition in trait_conditions if condition.get("operator") == "lte"), None)
            min_value = _normalize_number_value(min_condition.get("value")) if min_condition else None
            max_value = _normalize_number_value(max_condition.get("value")) if max_condition else None

        traits.append(
            {
                "traitId": definition["id"] if definition else None,
                "traitKey": trait_key,
                "label": definition["label"] if definition else _screen_label(trait_key),
                "valueType": value_type,
                "value": value,
                "intValue": int_value,
                "minValue": min_value,
                "maxValue": max_value,
                "boolValue": bool_value,
                "displayValue": _profile_trait_display_value(value_type, value, int_value, min_value, max_value, bool_value),
            }
        )
    return {
        "id": row["id"],
        "profileKey": row["segment_key"],
        "name": row["name"],
        "description": row["description"],
        "traits": traits,
        "enabled": row["enabled"],
        "updatedAt": row["updated_at"],
    }


def _coerce_profile_int(raw_int: Any, raw_value: Any, label: str) -> int:
    candidate = raw_int if raw_int is not None else raw_value
    if isinstance(candidate, bool):
        raise ValueError(f"Trait '{label}' needs a whole number.")
    if isinstance(candidate, int):
        return candidate
    if isinstance(candidate, float) and candidate.is_integer():
        return int(candidate)
    text_value = str(candidate or "").strip()
    if not re.fullmatch(r"-?\d+", text_value):
        raise ValueError(f"Trait '{label}' needs a whole number.")
    return int(text_value)


def _coerce_profile_bool(raw_bool: Any, raw_value: Any, label: str) -> bool:
    candidate = raw_bool if raw_bool is not None else raw_value
    if isinstance(candidate, bool):
        return candidate
    text_value = str(candidate or "").strip().lower()
    if text_value in {"true", "1", "yes"}:
        return True
    if text_value in {"false", "0", "no"}:
        return False
    raise ValueError(f"Trait '{label}' must be true or false.")


def _coerce_profile_range(raw_min: Any, raw_max: Any, label: str) -> tuple[float, float]:
    min_value = _coerce_profile_number(raw_min, f"Trait '{label}' needs a starting value.")
    max_value = _coerce_profile_number(raw_max, f"Trait '{label}' needs an ending value.")
    if min_value > max_value:
        raise ValueError(f"Trait '{label}' must use a start value that is less than or equal to the end value.")
    return min_value, max_value


def _coerce_profile_number(raw_value: Any, error_message: str) -> float:
    if raw_value is None or raw_value == "":
        raise ValueError(error_message)
    if isinstance(raw_value, bool):
        raise ValueError(error_message)
    if isinstance(raw_value, (int, float)):
        numeric_value = float(raw_value)
        if numeric_value != numeric_value or numeric_value in {float("inf"), float("-inf")}:
            raise ValueError(error_message)
        return numeric_value
    text_value = str(raw_value).strip()
    if not text_value:
        raise ValueError(error_message)
    try:
        numeric_value = float(text_value)
    except ValueError as exc:
        raise ValueError(error_message) from exc
    if numeric_value != numeric_value or numeric_value in {float("inf"), float("-inf")}:
        raise ValueError(error_message)
    return numeric_value


def _normalize_int_value(raw_value: Any) -> int | None:
    if raw_value is None or isinstance(raw_value, bool):
        return None
    if isinstance(raw_value, int):
        return raw_value
    if isinstance(raw_value, float) and raw_value.is_integer():
        return int(raw_value)
    text_value = str(raw_value).strip()
    if not re.fullmatch(r"-?\d+", text_value):
        return None
    return int(text_value)


def _normalize_bool_value(raw_value: Any) -> bool | None:
    if isinstance(raw_value, bool):
        return raw_value
    text_value = str(raw_value or "").strip().lower()
    if text_value in {"true", "1", "yes"}:
        return True
    if text_value in {"false", "0", "no"}:
        return False
    return None


def _normalize_number_value(raw_value: Any) -> float | None:
    if raw_value is None or raw_value == "" or isinstance(raw_value, bool):
        return None
    if isinstance(raw_value, (int, float)):
        numeric_value = float(raw_value)
        if numeric_value != numeric_value or numeric_value in {float("inf"), float("-inf")}:
            return None
        return numeric_value
    text_value = str(raw_value).strip()
    if not text_value:
        return None
    try:
        numeric_value = float(text_value)
    except ValueError:
        return None
    if numeric_value != numeric_value or numeric_value in {float("inf"), float("-inf")}:
        return None
    return numeric_value


def _infer_profile_trait_value_type(conditions: list[dict[str, Any]]) -> str:
    operators = {str(condition.get("operator") or "") for condition in conditions}
    if "gte" in operators or "lte" in operators:
        return "range"
    first_value = next((condition.get("value") for condition in conditions if condition.get("operator") == "eq"), None)
    if isinstance(first_value, bool):
        return "boolean"
    if _normalize_int_value(first_value) is not None:
        return "int"
    return "text"


def _profile_trait_display_value(
    value_type: str,
    value: str | None,
    int_value: int | None,
    min_value: float | None,
    max_value: float | None,
    bool_value: bool | None,
) -> str:
    if value_type in {"text", "select"}:
        return value or "No value"
    if value_type == "int":
        return str(int_value) if int_value is not None else "No value"
    if value_type == "boolean":
        if bool_value is None:
            return "No value"
        return "True" if bool_value else "False"
    if value_type == "range":
        if min_value is None or max_value is None:
            return "No range"
        return f"{_format_profile_number(min_value)} to {_format_profile_number(max_value)}"
    return value or "No value"


def _format_profile_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _assert_targeting_refs(db: Session, workspace_id: str, payload: dict[str, Any]) -> None:
    refs = [
        ("liquid_segments", payload.get("segmentId"), "Segment"),
        ("liquid_rules", payload.get("ruleId"), "Rule"),
        ("liquid_experiments", payload.get("experimentId"), "Experiment"),
    ]
    for table_name, resource_id, label in refs:
        if resource_id and not _resource_exists(db, table_name, workspace_id, resource_id):
            raise ValueError(f"{label} does not belong to this workspace.")


def _assert_workspace_resource(db: Session, table_name: str, workspace_id: str, resource_id: str, error_message: str) -> None:
    if not _resource_exists(db, table_name, workspace_id, resource_id):
        raise LookupError(error_message)


def _resource_exists(db: Session, table_name: str, workspace_id: str, resource_id: str) -> bool:
    exists = db.execute(
        text(
            f"""
            SELECT 1
            FROM {table_name}
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND id = CAST(:resource_id AS uuid)
            LIMIT 1
            """
        ),
        {"workspace_id": workspace_id, "resource_id": resource_id},
    ).scalar_one_or_none()
    return exists is not None


def _clear_default_variant(
    db: Session,
    workspace_id: str,
    key_id: str,
    locale: str | None,
    exclude_variant_id: str | None,
) -> None:
    exclude_clause = ""
    params: dict[str, Any] = {
        "workspace_id": workspace_id,
        "key_id": key_id,
        "locale": locale,
    }
    if exclude_variant_id:
        exclude_clause = "\n              AND id <> CAST(:exclude_variant_id AS uuid)"
        params["exclude_variant_id"] = exclude_variant_id
    db.execute(
        text(
            f"""
            UPDATE liquid_variants
            SET is_default = false, updated_at = now()
            WHERE workspace_id = CAST(:workspace_id AS uuid)
              AND key_id = CAST(:key_id AS uuid)
              AND stage = 'draft'
              AND COALESCE(locale, '') = COALESCE(:locale, '')
              {exclude_clause}
            """
        ),
        params,
    )


def _variant_out(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "stage": row["stage"],
        "locale": row["locale"],
        "content": _content_payload(row["content"]),
        "segmentId": row["segment_id"],
        "segmentKey": row["segment_key"],
        "ruleId": row["rule_id"],
        "ruleKey": row["rule_key"],
        "experimentId": row["experiment_id"],
        "experimentKey": row["experiment_key"],
        "experimentArm": row["experiment_arm"],
        "trafficPercentage": row["traffic_percentage"],
        "priority": row["priority"],
        "isDefault": row["is_default"],
        "enabled": row["enabled"],
        "updatedAt": row["updated_at"],
    }


def _content_payload(value: dict[str, Any] | None) -> dict[str, Any]:
    return LiquidContentPayload.model_validate(value or {}).model_dump()


def _condition_group(value: dict[str, Any] | None) -> dict[str, Any]:
    data = value or {"all": [], "any": []}
    return {
        "all": data.get("all", []),
        "any": data.get("any", []),
    }


def _screen_label(value: str) -> str:
    normalized = re.sub(r"[._/-]+", " ", value).strip()
    return normalized[:1].upper() + normalized[1:] if normalized else value


def _json_dump(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), default=str)
