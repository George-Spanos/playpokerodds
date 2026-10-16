## Why

On mobile the app shell breaks: the Caveat logo collides with nav items and the sign-in link is unreadable, and the board strip forces horizontal page scroll, which also makes the guess rail unusable (touching the rail drags the page). Separately, guessing only via the slider frustrates users who want an exact value, and the post-reveal chalk circle/burst around the guess is noise: the truth marker on the rail alone communicates the result.

## What Changes

- App shell (header/nav): the brand, nav links, and user status reflow legibly on narrow viewports (~360–430px) — no clipped logo, no horizontal page overflow from the header.
- Play surface: the board strip and opponents row wrap/scale within the viewport; horizontal page scroll on mobile is eliminated on the play screen (the rail must be draggable without page scroll).
- Guess input: add direct numeric text entry next to the slider (keyboard-accessible, mobile-friendly), synced both ways with the rail; slider remains the primary interaction.
- Reveal feedback: remove the chalk circle/burst decorations; the truth marker on the rail gains a small highlighted label showing the correct percentage at its position.

## Capabilities

### New Capabilities
- `app-shell`: responsive top navigation — brand, nav links, and user status must remain legible and non-overflowing down to 360px viewports.
- `play-guess-rail`: the guess rail — slider + numeric text input synced in both directions, and reveal feedback as a labeled truth marker (no circle/burst).

### Modified Capabilities
<!-- none: no specs exist yet in openspec/specs/ -->

## Impact

- `src/ui/index.html` (header markup, nav)
- `src/ui/src/js/components/userStatus.js` (sign-in/status markup)
- `src/ui/src/js/surfaces/play.js` (rail: numeric input, reveal feedback, circle/burst removal)
- `src/ui/src/styles/surfaces.css`, `src/ui/src/styles/chalk.css` (mobile layout, rail styles, numeric input styles)
- No API changes; no backend changes.
