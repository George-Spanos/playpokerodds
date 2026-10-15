## Context

See `migrate-web-api-to-rust/design.md` (shared Context/Decisions/Plan sections cover both changes; D1–D4 are the UI decisions).

## Goals / Non-Goals

**Goals:**
- Ship the approved chalkboard odds-sheet redesign as a framework-free vanilla JS client.
- Preserve every user-facing capability and the web-api contract.
- Remove Angular, RxJS, zone.js, immer, ngx-toastr, Karma, and the vendored poker-core from the client.

**Non-Goals:**
- Changing the web API or calc-odds service.
- Server-side rendering or SEO rework.

## Decisions

D1–D4 live in the shared design document (`../migrate-web-api-to-rust/design.md`): no-build ES modules; hand-rolled router + store; domain module ported from core semantics with Vitest; CSS-first token system implementing the direction contract in `.impeccable/surfaces/src-ui.md`.

Additional UI-specific decisions:

### D9: Card assets and 53-SVG set are kept untouched
The existing `src/ui/src/assets/cards/*.svg` are the product's card faces and the only full-color objects in the new world; they move to `src/ui/assets/cards/` unchanged.

### D10: One `index.html`, per-surface JS modules, per-surface stylesheets
History-API routing with a single entry; each surface is `src/js/surfaces/<name>.js` exporting `render(params)`; styles are `src/styles/<surface>.css` plus `tokens.css` and `chalk.css` (the shared chalk texture/line language).

## Risks / Trade-offs

- [Shared design file couples the two changes' docs] → Intentional: one migration plan, two executions; each change's tasks reference it.
- [Browser smoke coverage is manual] → Accepted for this scale; Vitest covers pure logic, detector + screenshots + finish reviewer cover the visual surface.
