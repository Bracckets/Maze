# Liquid

Liquid is Maze's runtime adaptive content engine.

Maze continues to capture product behavior and instrumentation health.
Liquid extends Maze by becoming the runtime source of truth for mobile content bundles.

## V1 scope

Liquid v1 supports:

- text resolution
- simple attributes: `icon`, `visibility`, `emphasis`, `ordering`
- screen-bundle delivery
- locale variants with fallback
- reusable rules
- reusable segments
- experiments with deterministic assignment
- draft and publish state
- mobile-friendly caching

Liquid v1 does not support:

- LLM calls at runtime
- AI copy generation
- arbitrary layout mutation
- free-form UI generation
- vertical-specific business logic

## Architecture summary

The implementation is intentionally native to the existing Maze repo:

- Backend: FastAPI routes under `/liquid`, a dedicated `app/liquid` module, and the existing text-SQL service style.
- Database: PostgreSQL tables added to `backend/maze.sql`, mirrored in `ensure_runtime_schema()`, plus a standalone migration file in `backend/storage/migrations`.
- Dashboard: a new authenticated `/liquid` surface inside the existing Next.js dashboard shell.
- Integration: Maze and Liquid share the same workspace key, runtime host, and SDK story.

## Data model

Core tables:

- `liquid_keys`
  Stores stable content keys, workspace scoping, default locale, and publish metadata.
- `liquid_variants`
  Stores draft and published content payloads plus targeting references.
- `liquid_screen_bundles`
  Stores stable screen identifiers and publish metadata.
- `liquid_screen_bundle_mappings`
  Maps keys into draft and published bundles with explicit ordering.
- `liquid_segments`
  Stores reusable audience definitions.
- `liquid_rules`
  Stores reusable request-context predicates.
- `liquid_experiments`
  Stores experiment metadata, allocation, and deterministic seed values.

Content is intentionally typed rather than free-form:

```json
{
  "text": "Start your trial",
  "icon": "sparkles",
  "visibility": "visible",
  "emphasis": "high",
  "ordering": 10
}
```

## Draft and publish model

Liquid uses copy-on-publish semantics:

- Admin editing writes to draft variants and draft bundle mappings.
- Publishing a key copies draft variants into the published stage.
- Publishing a bundle copies draft mappings into the published stage.
- Runtime resolution only reads published rows.
- Preview resolution only reads draft rows.

This keeps runtime deterministic and prevents accidental live edits.

## Resolver pipeline

Runtime resolution is bundle-first:

1. The client asks for one screen bundle.
2. Liquid loads the published bundle mappings for that screen.
3. Liquid gathers all published variants for those keys in one query.
4. The resolver applies:
   - locale matching and locale fallback
   - segment conditions
   - rule conditions
   - active experiment assignment
   - default fallback
   - safe hidden fallback

Experiment assignment is deterministic:

- The client can send a stable `subjectId`.
- Liquid hashes `subjectId + experiment seed + experiment key`.
- A bucket is chosen once and the matching experiment arm is returned.

If no experiment arm is selected, Liquid falls back to non-experiment variants and then to the default variant.

## Runtime contract

Published runtime endpoint:

```http
POST /liquid/runtime/bundles/resolve
X-API-Key: mz_live_...
```

Request:

```json
{
  "screenKey": "checkout_paywall",
  "locale": "en-US",
  "subjectId": "user-123",
  "platform": "ios",
  "appVersion": "6.8.0",
  "country": "US",
  "traits": {
    "plan": "growth"
  }
}
```

Response:

```json
{
  "screenKey": "checkout_paywall",
  "stage": "published",
  "revision": 3,
  "etag": "9d4f7f9ec64d2f4d",
  "ttlSeconds": 60,
  "generatedAt": "2026-04-12T10:42:00Z",
  "items": [
    {
      "key": "checkout_paywall.headline",
      "text": "Upgrade without leaving the flow",
      "icon": "sparkles",
      "visibility": "visible",
      "emphasis": "high",
      "ordering": 10,
      "locale": "en-US",
      "source": "experiment",
      "experiment": {
        "experimentKey": "paywall-copy",
        "arm": "treatment"
      }
    }
  ]
}
```

Preview endpoint:

```http
POST /liquid/preview/bundles/resolve
Authorization: Bearer <dashboard-session>
```

Preview reads draft state and returns the same shape with `stage: "draft"`.

## Dashboard coverage

The dashboard includes:

- Liquid overview metrics
- key search and creation
- draft key editing
- locale variant editing
- draft key publish action
- screen bundle authoring
- draft bundle publish action
- preview resolution
- segment management
- rule management
- experiment management

## Mobile integration

Maze remains the single SDK entry point.

iOS:

- `Maze.configure(...)`
- `Maze.resolveLiquidBundle(...)`
- `Maze.clearLiquidCache()`

Android:

- `Maze.configure(...)`
- `Maze.resolveLiquidBundle(...)`
- `Maze.clearLiquidCache()`

The SDKs now expose bundle resolution helpers and cache the last successful bundle response using the server-provided TTL.

## Caching

Runtime resolution responses use:

- `Cache-Control: private, max-age=60, stale-while-revalidate=300`
- `ETag` based on the resolved bundle payload

SDK-side guidance:

- cache by `screenKey + locale + subjectId + traits`
- respect `ttlSeconds`
- fall back to the last known bundle if the network is unavailable

## Deferred items

Deliberately deferred beyond v1:

- localization workflows with translation memory
- user-level personalization scoring beyond deterministic rules
- resolution logging and analytics for every content decision
- richer attribute types beyond the current safe set
- dashboard diff views between draft and published revisions
- automated rollout guardrails based on experiment performance

## Founder-facing decisions still needing approval

The implementation is shippable, but these product decisions still deserve explicit approval:

1. Whether bundle caching should stay at `60s` by default or become workspace-configurable.
2. Whether experiment traffic allocation should remain bundle-wide percentage gating or become per-arm sums that must equal `100`.
3. Whether disabled bundles should remain previewable in admin mode, which is how v1 currently behaves.
4. Whether Liquid should later expose server-side resolution logs for debugging, since v1 intentionally skips that table to keep the first release lean.
