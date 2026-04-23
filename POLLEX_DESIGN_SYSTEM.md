# Pollex Design System

This file is the local source of truth for all Pollex-facing UI in this repository.

Use it as a strict system, not loose inspiration. When a design decision is not explicitly specified elsewhere, default to the rules and tokens in this document. Do not introduce a different visual language for Pollex surfaces unless the user explicitly asks for an exception.

## Scope

Applies to:

- Marketing pages
- Product UI
- Dashboards
- Mobile screens
- Cards, tables, forms, empty states, navigation, badges, and other shared UI

Does not apply unless explicitly requested:

- Third-party branded surfaces
- Non-Pollex white-label experiences

## Core Visual Direction

Pollex uses a dark, minimal, geometric interface language with high contrast and restrained accent usage.

Design goals:

- Dense but readable layouts
- Monochrome-first palette
- Soft elevation, not glossy or colorful styling
- Rounded pills and rounded rectangles
- Abstract geometric brand motifs used sparingly as accents
- Clear hierarchy through spacing, weight, and contrast instead of decorative color

Avoid:

- Bright multi-color palettes
- Gradient-heavy hero sections unless explicitly approved
- Soft consumer-style pastel UI
- Generic SaaS card grids that ignore the Pollex geometry and density
- Sharp-cornered components that break the rounded system

## Color Tokens

These values come directly from the provided Pollex UI board.

```text
Background:      #0E0E0F
Surface:         #171719
Surface Elevated:#1F1F24
Border:          #2A2D31
Text Primary:    #FFFFFF
Text Secondary:  #A1A1AA
Text Disabled:   #666A70
Accent:          #FFFFFF
```

Usage guidance:

- Use `#0E0E0F` for the app/page background.
- Use `#171719` for primary panels and sections.
- Use `#1F1F24` for raised cards, modals, and emphasized surfaces.
- Use `#2A2D31` for borders, dividers, input outlines, segmented controls, and quiet structure.
- Use `#FFFFFF` for primary text and primary emphasis.
- Use `#A1A1AA` for supporting copy and secondary labels.
- Use `#666A70` for disabled text and low-priority UI text.
- Treat the accent as white-first. Do not introduce a branded accent color by default.

## Typography

Font family:

- `Plus Jakarta Sans`

Type scale from the board:

```text
Display:   36/44, Bold
Heading 1: 28/36, Bold
Heading 2: 20/28, Semibold
Body Large:16/24, Regular
Body:      14/20, Regular
Caption:   12/16, Regular
```

Typography rules:

- Use bold weights for large headlines.
- Keep body copy compact and clean.
- Favor short, direct copy over long marketing prose.
- Use strong contrast between headings and body text.
- Do not swap in a different display font for Pollex UI.

## Spacing And Radius

Spacing scale from the board:

```text
4px, 8px, 12px, 24px, 32px, 48px, 64px, 96px
```

The system is described as an `8pt grid`, but the board also includes `4px` and `12px` steps. Treat the full set above as the allowed spacing scale.

Radius scale from the board:

```text
4px, 8px, 12px, 16px, 24px, Full
```

Radius rules:

- Use `Full` for pills, chips, and rounded button shells.
- Use `12px` to `24px` for cards and panels depending on size.
- Use smaller radii for inputs and compact controls.
- Do not mix in sharp corners unless the user explicitly requests it.

## Iconography

Icon style from the board:

- `2px` stroke
- Rounded caps
- Geometric forms

Icon rules:

- Prefer simple line icons with consistent stroke weight.
- Keep icons monochrome or near-monochrome.
- Avoid emoji-like or playful illustration-style icons.
- Use the abstract Pollex geometry language where appropriate.

## Brand Geometry

The visual system repeatedly uses minimal geometric marks:

- Triangle/play shape
- Square/block forms
- Triple vertical bars
- X mark
- Plus mark
- Diagonal stripe clusters

Rules for brand geometry:

- Use these shapes as sparse decorative accents, not as clutter.
- Keep them white or subtle grayscale on dark backgrounds.
- Maintain generous negative space around them.
- Do not turn the interface into a pattern library of floating shapes on every screen.

## Components

### Buttons

Observed variants:

- Primary pill button
- Secondary outline button
- Tertiary text button
- Circular icon buttons

Rules:

- Default to pill-like rounded buttons.
- Primary buttons should feel solid and high-contrast.
- Secondary buttons should use restrained outlines.
- Tertiary buttons should stay visually quiet.
- Keep button styling minimal and geometric.
- Avoid heavy shadows, loud gradients, or colorful fills.

### Inputs And Controls

Observed controls:

- Text input
- Dropdown
- Toggle
- Checkbox
- Radio
- Slider
- Segmented control
- Tabs

Rules:

- Inputs should sit on dark surfaces with subtle borders.
- Labels and placeholders should use subdued text colors.
- Controls should feel compact and product-oriented, not oversized.
- Active states should remain clean and monochrome-first.

### Cards

Observed patterns:

- Dense dark cards with soft borders
- Rounded corners
- Minimal but clear separation from background
- Copy and icon-led composition

Rules:

- Use cards to group related product value or data.
- Keep padding measured and consistent.
- Prefer border definition over dramatic shadow.
- Use elevated surface sparingly to create hierarchy.

### Badges, Tags, And Status

Observed patterns:

- Rounded chips
- Quiet neutral badges
- Occasional semantic statuses
- Small status dots

Rules:

- Keep badges understated.
- Use semantic colors only when the meaning requires them.
- Do not let status colors dominate the interface.

### Tables

Rules inferred from the board:

- Keep tables compact and legible.
- Use subtle dividers and dark rows.
- Reserve bright emphasis for actionable or active state text.

### Navigation, Pagination, Breadcrumbs, Empty States

Rules:

- Navigation should be compact and unobtrusive.
- Pagination and breadcrumbs should be minimal and low-noise.
- Empty states should be centered, sparse, and action-oriented.
- Use the same dark surfaces, rounded corners, and subdued borders as the rest of the system.

## Layout Guidance

The board shows both web and mobile layouts that share the same principles.

Layout rules:

- Use dark full-page canvases with sectioned surfaces.
- Combine strong headline blocks with restrained supporting copy.
- Favor clear vertical rhythm over excessive ornamentation.
- Keep content widths controlled and balanced.
- Use geometric accents intentionally, usually in hero or brand moments.
- Preserve the same system across desktop and mobile rather than inventing a separate visual language.

## Interaction Feel

Pollex UI should feel:

- Precise
- Calm
- Analytical
- Premium
- Friction-aware

It should not feel:

- Playful
- Colorful
- Cute
- Glossy
- Over-animated

## Implementation Defaults

When building Pollex-facing UI in this repo, default to:

- Dark theme by default
- `Plus Jakarta Sans`
- Monochrome-first styling
- Rounded pills and rounded cards
- Subtle borders instead of loud shadows
- Tight, deliberate spacing
- Minimal, geometric iconography

## Decision Rule

If a proposed UI decision conflicts with this document, this document wins for Pollex-facing surfaces unless the user explicitly overrides it.

If a screen already exists in code but visually conflicts with this system, future edits should move it toward this system rather than preserve the divergence.

## Source

This document was derived from the user-provided Pollex UI board image and is intended to be the repository-local reference for future work.
