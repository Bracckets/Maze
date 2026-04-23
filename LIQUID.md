# Liquid

Liquid is Maze's guided-automation content engine.

Maze captures product behavior and instrumentation health. Liquid uses that context to resolve safe app copy at runtime while keeping fallback text deterministic, reviewable, and easy to ship.

## Product model

Liquid is built around one primary object: the content key.

- A key belongs to one observed Maze screen.
- A key always has default fallback text.
- A key can have profile-specific variants.
- A profile is a reusable set of typed trait conditions.
- A trait definition explains both the type of a value and where it comes from.

Trait sources are explicit:

- `app_profile`
  The app or backend provides the value at runtime, for example `user.plan` or `user.region`.
- `pollex_computed`
  Pollex derives the value from behavior, for example `pollex.intent_level`.
- `manual_test`
  Preview-only input for draft testing. This is never live-eligible.

## Supported scope

Liquid currently supports:

- text resolution
- safe attributes: `icon`, `visibility`, `emphasis`, `ordering`
- screen-bundle delivery
- locale variants with fallback
- reusable typed traits
- reusable user profiles
- deterministic experiments
- draft and publish state
- preview diagnostics
- readiness checks before publish
- mobile-friendly caching

Liquid does not support:

- LLM calls at runtime
- AI copy generation
- arbitrary layout mutation
- free-form UI generation
- inference of sensitive identity traits like age or gender from behavior

## Architecture summary

The implementation stays native to the existing Maze repo:

- Backend: FastAPI routes under `/liquid`, a dedicated `app/liquid` module, and the existing text-SQL service style.
- Database: PostgreSQL tables in `backend/maze.sql`, mirrored in `ensure_runtime_schema()`, plus standalone migrations in `backend/storage/migrations`.
- Dashboard: an authenticated `/liquid` surface inside the existing Next.js shell.
- Integration: Maze and Liquid share the same workspace key, backend host, and SDK story.

## Data model

Core tables:

- `liquid_keys`
  Stable content keys, workspace scoping, default locale, and publish metadata.
- `liquid_variants`
  Draft and published content payloads plus targeting references.
- `liquid_screen_bundles`
  Stable screen identifiers and publish metadata.
- `liquid_screen_bundle_mappings`
  Maps keys into draft and published bundles with explicit ordering.
- `liquid_segments`
  Reusable user profiles and profile conditions.
- `liquid_profile_traits`
  Reusable trait catalog including value type, source type, source key, and example values.
- `liquid_subject_traits`
  Stored app-provided traits keyed by workspace and subject.
- `liquid_computed_traits`
  Cached Maze-derived behavior traits keyed by workspace and subject.
- `liquid_resolution_logs`
  Preview and runtime diagnostics used by staging, onboarding, and analytics.
- `liquid_rules`
  Compatibility layer for reusable request-context predicates.
- `liquid_experiments`
  Experiment metadata, allocation, and deterministic seed values.

Content remains intentionally typed rather than free-form:

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

Before publish, Liquid evaluates readiness:

- `ready`
- `missing_source`
- `test_only`
- `low_coverage`
- `fallback_only`

Manual-test traits are blocked from live publish, and missing runtime sources surface as blocking issues in staging and the dashboard.

## Resolver pipeline

Runtime resolution is bundle-first:

1. The client asks for one screen bundle.
2. Liquid loads the published bundle mappings for that screen.
3. Liquid gathers all published variants for those keys in one query.
4. Liquid merges runtime context in this order:
   - app-provided request traits
   - stored subject traits already seen by Maze
   - Pollex-computed behavior traits
   - preview-only overrides in draft preview
5. The resolver applies:
   - locale matching and locale fallback
   - profile and segment conditions
   - rule conditions
   - active experiment assignment
   - default fallback
   - safe hidden fallback

Experiment assignment is deterministic:

- The client can send a stable `subjectId`.
- Liquid hashes `subjectId + experiment seed + experiment key`.
- A bucket is chosen once and the matching experiment arm is returned.

If no experiment arm is selected, Liquid falls back to non-experiment variants and then to the default variant.

Preview and admin flows also expose diagnostics:

- which traits were present
- which source each trait came from
- which traits were missing
- which profiles matched
- why a fallback happened

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
    "user.plan": "growth"
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
  "generatedAt": "2026-04-17T10:42:00Z",
  "items": [
    {
      "key": "checkout_paywall.headline",
      "text": "Upgrade without leaving the flow",
      "icon": "sparkles",
      "visibility": "visible",
      "emphasis": "high",
      "ordering": 10,
      "locale": "en-US",
      "source": "default",
      "matchedProfileKey": "power_users",
      "fallbackReason": null
    }
  ],
  "diagnostics": {
    "resolvedTraits": [
      {
        "traitKey": "plan",
        "value": "growth",
        "sourceType": "app_profile",
        "sourceKey": "user.plan",
        "present": true,
        "liveEligible": true
      }
    ],
    "missingTraits": [],
    "traitSources": {
      "plan": "app_profile"
    },
    "matchedProfileCount": 1,
    "fallbackItemCount": 0
  }
}
```

Preview endpoint:

```http
POST /liquid/preview/bundles/resolve
Authorization: Bearer <dashboard-session>
```

Preview reads draft state and returns the same shape with `stage: "draft"`, plus diagnostics about resolved traits, missing traits, matched profiles, and fallback reasons.

## Computed traits

Pollex currently derives only non-sensitive behavioral traits:

- `pollex.intent_level`
- `pollex.usage_depth`
- `pollex.recent_activity`
- `pollex.paywall_fatigue`
- `pollex.onboarding_stage`

These are operational signals, not identity inference.

## Dashboard coverage

The dashboard includes:

- key CRUD using observed Maze screens
- trait definition management with explicit sources and coverage
- profile management backed by reusable traits
- profile-specific variant editing
- staging with readiness checks and publish/demote actions
- preview resolution with diagnostics
- analytics for fallback rate, match rate, and trait coverage
- onboarding and integration status for observed screens and runtime activity

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

The SDKs expose bundle resolution helpers and cache the last successful bundle response using the server-provided TTL.

## Caching

Runtime resolution responses use:

- `Cache-Control: private, max-age=60, stale-while-revalidate=300`
- `ETag` based on the resolved bundle payload

SDK-side guidance:

- cache by `screenKey + locale + subjectId + traits`
- respect `ttlSeconds`
- fall back to the last known bundle if the network is unavailable

## Deferred items

Deliberately deferred:

- localization workflows with translation memory
- user-level personalization scoring beyond deterministic rules
- richer attribute types beyond the current safe set
- automated rollout guardrails based on experiment performance
