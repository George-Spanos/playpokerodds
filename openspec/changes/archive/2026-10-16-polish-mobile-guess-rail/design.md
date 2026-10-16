## Context

CSR vanilla-JS app, chalk-on-slate token system (`tokens.css`), chalk material language (`chalk.css`). Header is a single flex row (`.chalk-nav`): brand + links + `#user-status` pushed right with `margin-left:auto`; no wrap → collisions ≤375px. Play surface: `.board-strip` flex with five fixed 64px cards (~368px + padding) → horizontal page scroll on phones; the rail is a `pointerdown`/`pointermove` div whose drag currently coexists with page scroll on touch. `reveal()` draws `.chalk-circle`/`.chalk-burst` overlays; `.rail-truth` already marks the true position as a plain vertical line without a label.

## Goals / Non-Goals

**Goals:**
- Header reflows at 360px: brand readable, sign-in tappable, no overflow.
- Play surface fits 360px width; rail drag never scrolls the page.
- Exact guess entry via a numeric input synced with the rail.
- Truth marker: small amber percentage label at the truth position; circle/burst removed.

**Non-Goals:**
- No redesign of panels/cards, no desktop layout changes beyond what reflow requires.
- No backend/API changes; no changes to scoring or reveal flow order.

## Decisions

- **Header wrap, not hamburger**: at ≤600px the nav becomes a two-row layout — row 1: brand + user status; row 2: nav links; `flex-wrap: wrap` with `min-width: 0` on children so long text can shrink. A hamburger adds JS state and hides the primary loop for no space win at these widths. Alternative rejected: shrinking brand font below `--text-lg` (unreadable chalk handwriting at small sizes).
- **Board strip wraps, not horizontal scroller**: five community slots wrap to two rows at ≤430px with slightly smaller card slots (48px), matching how opponents already wrap. Alternative rejected: `overflow-x: auto` strip — a nested horizontal scroller recreates the exact frustration being removed.
- **Numeric entry as `type="text" inputmode="decimal"`** styled as chalk numerals, sitting under the big display value; the display value remains the readback. Sanitize on `input`/`change`: allow digits only, clamp to 0–100 on `change`/blur/Enter; do not rewrite the field mid-typing (spec). Slider is the primary control; the input is an editable readout of the same value (one source of truth in `buildRail`'s `setEstimate`).
- **Truth label replaces circle/burst**: `.rail-truth` keeps its vertical line; a small `rail-truth-label` (amber-300, `--text-xs`, chalk numbers font) sits above the line at the same `left:%`, content like `44`. Ghost thumb still marks the previous guess; guess thumb locks white on reveal as today. Delete `.chalk-circle`, `.chalk-burst`, their keyframes, and the `reveal()` branches; `deal()`'s cleanup selector drops the removed classes.
- **Rail touch behavior**: `touch-action: none` on `.rail` so touch drags drive the estimate instead of page scroll. Page-level horizontal scroll is eliminated by the wrap fixes, so this doesn't trap scroll: the rail is a 4rem-tall strip, cheap to exit vertically.

## Risks / Trade-offs

- [Wrapped nav grows header height on phones] → `--nav-height` is only used for `min-height` math on `.play-grid`; wrapped header adds ~2.5rem, acceptable. Keep sticky-free header.
- [`inputmode="decimal"` shows no spinner; users may expect one] → intentional; slider remains primary. Digits-only sanitize prevents junk input.
- [Removing circle/burst loses the "nailed it" flourish] → verdict copy ("Nailed it…") + amber truth label carry the feedback; burst keyframes deleted rather than left dead.
- [Numeric input focus on mobile opens keyboard covering the rail] → input is inside the guess panel near the rail; keyboard opens after deliberate tap, slider still usable after dismissal.

## Migration Plan

Pure client-side change, shipped with the UI service. Rollback = revert commit.

## Open Questions

None.
