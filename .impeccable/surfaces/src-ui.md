---
version: 1
slug: "src-ui"
primary_target: "src/ui"
related_targets: []
---

# Surface brief: play (home) — Play Poker Odds!

## Scope & mode

Whole-app visual world (routes: play/home, leaderboards, auth, profile/history/favorites). Mode: Experience — the game is the work; the interface recedes. Devices: desktop and mobile are equal first-class layouts.

## Audience, job, action

Poker hobbyists training equity intuition. Job: play a round, commit a guess, see the truth, immediately deal again. Primary action: reveal odds after guessing. Anonymous visitors reach a dealt round in one interaction.

## Direction contract

THESIS: The cardroom back-office chalkboard — the scorer's pad every home game actually keeps — refuses the casino floor and refuses the stats dashboard: odds training as chalk on a slate behind the counter, not a product in either costume.

OWN-WORLD: Deep green-black slate ground (chalkboard green-black, not pure black), chalk-white line work and lettering, one chalk-dust accent family (amber ochre chalk for warnings/armed, as real chalk trays hold); card faces are the only full-color objects, dealt like real pasteboards on chalk outlines; panels are chalk-drawn frames (double-line borders, hand-drawn corner ticks), never filled cards with shadows.

STORY: The visitor understands within one viewport: a round is dealt, my hand is real, their cards are unknown (chalk outlines), I chalk my guess on the 0–100 rail, then the true odds draw themselves in and my error gets circled. Believes: this is a trainer's scorer's pad, honest about numbers, zero casino. Does: guesses, reveals, deals again — optionally signs in to keep score.

FIRST VIEWPORT: Desktop: full-bleed slate; left two-thirds the dealt round — my hand as two large real card faces above the chalk outline of the board; opponents as smaller chalk-outline hands; right third the chalked 0–100 rail with a live chalk cursor following input and a big "REVEAL" chalk-button beneath; top edge a thin chalk-line nav (play / leaderboard / sign in). Mobile: single column — cards at top, rail mid-screen thumb-reachable, reveal beneath; nav collapses to chalk-drawn menu. Primary action (reveal) sits bottom-right desktop / bottom-center mobile, drawn as filled chalk stroke.

FORM: Full-bleed chalkboard app (code-led build; no comp). Seed key: e6add8bb. Signature interaction: lock-on-reveal — your chalked guess mark stops free-running the moment you commit; the true odds stroke in beside it (drawn-on animation, one overshoot), and the error is circled with a single hand-drawn chalk ellipse. State grammar: solid chalk = committed · dashed chalk = pending/unknown · ghost smudge = last round's mark. Navigation is chalk-line tabs, never pills. Charts (history/accuracy) are hand-inked forms — wrapped bars, spirals — in chalk white on slate, per the Du Bois raise.

## Memorable moment

The reveal: the user's chalked guess on the 0–100 rail, the true odds stroking in beside it, the error circled in chalk.

## Unresolved decisions

- Auth/leaderboards/profile surfaces follow the same world; their layouts are not yet specified.
- Statistical history charts (Du Bois raise) — chart forms to be authored during build.
