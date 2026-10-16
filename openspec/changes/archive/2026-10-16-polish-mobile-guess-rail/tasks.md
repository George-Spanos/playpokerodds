## 1. App shell

- [x] 1.1 Make `.chalk-nav` reflow on narrow viewports: wrap into brand+status row and links row ≤600px; brand stays readable at 360px; sign-in link gets ≥44px touch target. Verify: DOM at 360px viewport shows full brand text, no clipped/colliding items.
- [x] 1.2 Adjust `userStatus.js`/CSS so status text and links render as proper inline links with adequate touch targets on mobile. Verify: anonymous 360px render shows a visible, tappable "sign in".

## 2. Play surface mobile layout

- [x] 2.1 Eliminate horizontal page overflow at 360–430px: wrap `.board-strip` to two rows with smaller card slots ≤430px, ensure opponents grid/cards, `.my-cards`, and `.deal-bar` fit. Verify: `document.scrollingElement.scrollWidth <= innerWidth` at 360px and 430px with a dealt river round.

## 3. Guess rail: numeric entry + reveal feedback

- [x] 3.1 Add numeric text entry to `buildRail` synced both ways with the slider (digits only while typing, clamp 0–100 on change/blur/Enter, slider drag updates the field). Verify: typing 37 moves thumb to 37; drag to 62 updates field; 140 clamps to 100 on commit.
- [x] 3.2 Make rail touch-drag not scroll the page (`touch-action: none` on `.rail`). Verify: `getComputedStyle(rail).touchAction === 'none'`; drag updates estimate.
- [x] 3.3 Replace circle/burst with labeled truth marker: delete `.chalk-circle`/`.chalk-burst` CSS + keyframes and their `reveal()` branches; render small amber percentage label at the truth position alongside `.rail-truth`; update `deal()` cleanup selector. Verify: after reveal, rail shows amber "44"-style label at truth position; no circle/burst elements exist anywhere in `src/ui`.

## 4. Verification

- [x] 4.1 Browser-verify desktop and 360px mobile: play loop (deal → set guess by slider and by text → reveal → next round), no page horizontal scroll, truth label correct. Evidence: screenshots.
- [x] 4.2 `npm test` green in `src/ui`; no regressions in domain logic.
