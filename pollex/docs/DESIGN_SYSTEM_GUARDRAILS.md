# Design System Guardrails

The design system is the source of truth for every adaptation Tactus returns. Tactus can only return structured adaptations for fields allowed by policy, and those adaptations must validate against the active design-system record.

## Model

The design system has three main parts:

- `tokens`: approved values such as sizes, variants, typography styles, spacing names, and other design-system primitives.
- `component_contracts`: per-component rules that describe what can change for `button`, `text`, `input`, and other element types.
- `brand_voice`: copy constraints such as allowed tone, emoji usage, and default max text length.

## Approved Size Tokens

Size adaptations are semantic. A proposal such as `{ "size": "lg" }` maps to an SDK class like `pollex-size-lg`; it never maps to arbitrary inline CSS.

Define size tokens in `tokens.sizes`:

```json
{
  "tokens": {
    "sizes": ["sm", "md", "lg", "xl"],
    "variants": ["primary", "secondary", "ghost"]
  }
}
```

If Tactus proposes a token that is not in `tokens.sizes`, the policy validator blocks it and the SDK receives a fallback decision.

## Component Contracts

Component contracts let teams limit adaptations by element type:

```json
{
  "component_contracts": {
    "button": {
      "allowed": ["text", "size", "tooltip"],
      "blocked": ["color", "position", "layout"]
    },
    "text": {
      "allowed": ["text"],
      "blocked": ["raw_html"]
    },
    "input": {
      "allowed": ["helper_text", "aria_label"],
      "blocked": ["value", "placeholder_from_input"]
    }
  }
}
```

Phase 4 still enforces the strongest rules in policy validation. Contracts are stored so future phases can add richer per-component checks.

## Versioning

Design-system updates are append-only. Studio creates a new `design_systems` row with an incremented `version` instead of overwriting the existing row. The current version is the highest version number.

This prevents accidental guardrail destruction: prior versions remain available for audit and rollback planning.

## Safety Blocks

The policy validator blocks:

- raw CSS strings
- raw HTML strings
- position changes
- layout changes
- unapproved design-system tokens
- text longer than the request constraint
- emoji when disabled
- unclear tone patterns such as excessive punctuation or all-caps copy

Size and variant proposals are checked against the active design-system tokens. If an approved token is missing, the adaptation is blocked and the SDK receives a fallback decision.

## Example

```json
{
  "name": "Acme Checkout DS",
  "version": 3,
  "tokens": {
    "sizes": ["sm", "md", "lg"],
    "variants": ["primary", "secondary", "ghost"],
    "typography": ["heading", "body", "caption"]
  },
  "component_contracts": {
    "button": {
      "allowed": ["text", "size", "tooltip"],
      "blocked": ["color", "position", "layout"]
    },
    "text": {
      "allowed": ["text"]
    },
    "input": {
      "allowed": ["helper_text", "aria_label"]
    }
  },
  "brand_voice": {
    "tone": ["clear"],
    "emoji": false,
    "maxTextLength": 24
  }
}
```
