# Tactus Engine Architecture

Tactus is organized around a fail-open SDK path. If anything inside the engine fails, SDK callers receive an empty adaptation decision and render their default UI.

The Tactus loop is:

`Observe -> Understand -> Propose -> Guard -> Resolve -> Measure -> Remember`

## Modules

- `sdk`: FastAPI routes for identify, events, resolve, and batch resolve.
- `tactus/observe`: event privacy filtering and normalization.
- `tactus/profile`: deterministic profile scoring and identity merging.
- `tactus/propose`: static rule-based proposal generation.
- `tactus/policy`: risk classification and policy validation.
- `tactus/resolve`: orchestration across profile, policy, proposal, and decision persistence.
- `tactus/cache`: cache interface plus in-memory fallback.
- `tactus/agents`: deterministic stubs reserved for later phases.

## Responsibilities

Observe receives SDK events, strips sensitive values, validates element keys, rejects stale/future events, and stores append-only interaction rows.

Understand updates UX profiles from deterministic counters and scores. Phase 4 still uses traits such as `prefers_simple_copy`, `needs_larger_targets`, `prefers_arabic`, and `high_friction`.

Propose uses static safe maps and rules. It never calls an LLM for render-path copy or translation.

Guard validates proposals against policy, risk level, request constraints, sensitive context, and design-system tokens.

Resolve orchestrates the loop: load profile, load policy, load design system, run proposals, validate, persist a decision, and return the SDK response. Any unhandled error becomes a safe fallback.

Measure records outcomes for future learning. Phase 4 stores outcomes but does not yet perform asynchronous score adjustment.

Remember keeps raw events and UX profiles separate. Events are append-only; profiles store aggregate traits, scores, counters, and preferences.

## Batch Resolve

`POST /sdk/resolve/batch` loads the profile once and resolves each element independently. Phase 4 does not enforce cross-element consistency on the same page; that is a future design-system concern.

## Cache Strategy

Phase 1/4 cache keys:

- `ux_profile:{workspace_id}:{project_id}:{environment}:{subject_id}` with a 300s TTL.
- `policy:{workspace_id}:{project_id}:{environment}:{element_key}` with a 600s TTL.
- `design_system:{workspace_id}:{project_id}` with a 600s TTL.

The SDK also caches `resolve()` responses per element key and subject for 30 seconds and clears that cache after `identify()`.

## Agents

Agents are stubs today:

- `FrictionAnalystAgent`
- `UXProfileAgent`
- `AdaptationProposalAgent`
- `ExplanationAgent`

They plug in after deterministic profile/proposal steps as optional enrichment. They do not apply UI changes directly. Future agents may help when signals conflict, patterns are ambiguous, or natural-language explanation is needed.

## Deterministic Today

- event sanitation and normalization
- profile counter/score updates
- locale trait application
- identity merge
- safe label, tooltip, and Arabic map proposals
- policy/risk/design-system validation
- fail-open resolver fallbacks
- rate limiting and event endpoint hardening

## Future AI

AI is appropriate for ambiguous signal interpretation, policy review assistance, and explanation generation. It is not appropriate for arbitrary CSS, raw HTML, legal/pricing/medical/financial mutation, or a default call on every render path.

Design-system tokens and policy are loaded before any adaptation is returned. Tactus never returns arbitrary CSS, raw HTML, or layout mutation instructions.
