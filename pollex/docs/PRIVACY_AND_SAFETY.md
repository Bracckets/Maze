# Privacy And Safety

Phase 1 stores raw interaction events separately from UX profiles. Events are append-only; profiles contain aggregate traits, scores, counters, and preferences.

The observation pipeline strips sensitive keys such as password, card, SSN, raw input, and keystroke fields. Email-like and phone-like strings are redacted from event values and context before storage.

Safety rules:

- The design system is the source of truth.
- Policy decides what can be applied.
- SDK callers fail open and keep their default UI when Pollex is unavailable.
- No LLM is called on the render path.
- Traits and scores drive customization; per-user UI rules are not created.
- Legal, medical, financial, pricing, color, position, and layout changes are blocked unless future policy explicitly supports them.
