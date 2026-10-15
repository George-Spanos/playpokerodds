---
name: Play Poker Odds!
description: Forget about bets. Focus on winning chances — a poker equity trainer styled as a cardroom back-office chalkboard.
colors:
  slate-950: "#101613"
  slate-900: "#141c17"
  slate-850: "#18221b"
  slate-800: "#1d2a21"
  slate-700: "#26362b"
  chalk-100: "#f2f5ef"
  chalk-200: "#e4e9e0"
  chalk-300: "#cfd6ca"
  chalk-400: "#aeb8a8"
  chalk-500: "#8b968a"
  chalk-600: "#6b766b"
  amber-300: "#e8c882"
  amber-400: "#d9a94e"
  amber-500: "#c08a3e"
  clay-400: "#d98d6a"
typography:
  display:
    fontFamily: "Caveat, cursive"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Patrick Hand, cursive"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  numbers:
    fontFamily: "Patrick Hand, monospace"
    fontSize: "3.25rem"
    fontWeight: 400
rounded:
  panel: "6px"
  card: "8px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "1rem"
  4: "1.5rem"
  5: "2.5rem"
  6: "4rem"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.amber-300}"
    rounded: "{rounded.panel}"
    padding: "0.5rem 1.5rem"
  panel:
    backgroundColor: "{colors.slate-850}"
    textColor: "{colors.chalk-100}"
    rounded: "{rounded.panel}"
---

# Design System: Play Poker Odds!

## Overview

**Creative North Star: "The cardroom back-office chalkboard"**

The interface is the scorer's pad every home game actually keeps: a green-black slate behind the counter, chalk line work, real pasteboard cards dealt on top as the only full-color objects. Nothing here is a casino — no felt, no gold, no lights — and nothing is a dashboard; the numbers are chalked, not streamed. Panels are drawn, not filled: double-line chalk frames with hand-tilted corner ticks.

State is chalk grammar, not color switches: **solid chalk = committed, dashed = pending/unknown, ghost smudge = last round's mark**. Amber-ochre chalk marks the armed/active element (the guess thumb, the primary button) the way a real chalk tray holds one warm stick.

**Key Characteristics:**
- Slate ground, chalk-white line work, single warm accent family
- Drawn panels (borders + corner ticks), never filled cards with shadows
- Real card-face SVGs as the only full-color objects
- Hand-lettered display type (Caveat) over hand-printed body type (Patrick Hand)

## Colors

One chalk family on slate, one ochre accent, one clay for errors. Color is material, not decoration.

### Primary
- **Chalk White** (#f2f5ef): all primary ink — line work, headings, committed marks, the drawn truth marker on the rail.

### Secondary
- **Amber Ochre** (#d9a94e): the armed accent — guess thumb at rest, primary button stroke, active nav underline, the circled error. Its rarity is the point; it marks "the thing waiting for you".

### Neutral
- **Slate 900** (#141c17): page ground.
- **Slate 850** (#18221b): panel fill.
- **Chalk 400** (#aeb8a8): soft ink — labels, secondary text.
- **Chalk 600** (#6b766b): faint ink — disabled, ghost, numerals.
- **Clay** (#d98d6a): errors only ("Off by…"), never decoration.

### Named Rules
**The Pasteboard Monopoly Rule.** Full color belongs to card faces alone. UI chrome is chalk on slate; never introduce a third saturated color.

## Typography

**Display Font:** Caveat (self-hosted woff2) — hand-lettered chalk script for headings.
**Body Font:** Patrick Hand (self-hosted woff2) — hand-printed chalk caps for everything else, including numerals.

**Character:** A scorer's handwriting, not a printer's set type. Sizes step clearly (0.875 → 1 → 1.25 → 1.5 → 2 → 3.25rem); the big guess numeral is the loudest type on any screen.

### Hierarchy
- **Display** (Caveat 700, 2–3.25rem, 1.15): surface titles, the brand.
- **Body** (Patrick Hand, 1rem–1.25rem, 1.6): all copy, buttons, table cells.
- **Numeral** (Patrick Hand, 3.25rem): the live guess value and rail labels.

### Named Rules
**The Hand-Only Rule.** No system sans, no serif, no mono-as-costume. If a glyph renders in a platform font, it is a bug.

## Layout

Max-width 1200px container. Play surface is a two-column grid on desktop (table 2fr : guess panel 1fr, panel sticky) collapsing to one column ≤900px with the guess panel below the table. Spacing scale is 0.25/0.5/1/1.5/2.5/4rem; more space above a heading than below. Mobile: 390px single column, thumb-reachable rail and reveal, cards step down to 58×81px.

## Elevation & Depth

Flat chalk world with one soft ambient shadow for physical lift — panels cast `0 2px 6px rgba(0,0,0,0.35)`, card faces cast `0 3px 10px rgba(0,0,0,0.45)` (cards are physical objects on the board; the board itself is nearly flat). No colored halos, no glow, no hover-lift games.

## Shapes

Panels: 6px radius, 2px chalk stroke, double-line effect via inset ring, hand-tilted corner ticks (14px, rotated −8deg). Cards: 8px radius (pasteboard). Buttons mirror panels. The one organic form is the chalk ellipse that circles the error — deliberately imperfect (`border-radius: 50% 46% 52% 48% / 55% 48% 52% 45%`).

## Components

### Buttons
- **Shape:** 6px radius, 2px chalk stroke, transparent fill.
- **Primary:** amber stroke + amber-300 text; on `:active` fills amber with slate text.
- **Disabled:** dashed stroke, faint ink.
- **Hover:** 8% chalk wash. **Focus:** 3px amber ring at 45% opacity.

### Panels / Cards
- **Corner:** 6px. **Fill:** slate-850. **Border:** 2px chalk-300 + inset ring + corner ticks. **Padding:** 1.5rem.

### The Guess Rail (signature component)
A 0–100 chalk scale: 2px track, ticks every 10 (majors taller), chalk numerals at 0/50/100, amber thumb following the pointer/arrow keys. On reveal: thumb locks (turns chalk-white), the true odds draw in as a tall white stroke with one ease-out overshoot, and a hand-drawn amber ellipse circles the gap. On redeal: the old thumb stays as a ghost smudge, truth and circle clear.

### Cards
Real SVG faces (`assets/cards/<card>.svg`), the only full-color objects. Unknown cards render as dashed chalk outlines — never as card backs.

### Navigation
Chalk-line tabs: hand-printed labels, amber underline on the current page, no pills, no fills.

## Do's and Don'ts

### Do:
- **Do** use chalk grammar for state: solid/dashed/ghost.
- **Do** draw icons as inline SVG in chalk stroke (2px, round joins).
- **Do** keep the amber accent under ~10% of any screen.
- **Do** theme browser surfaces (selection, caret, scrollbar, focus) from the palette.

### Don't:
- **Don't** introduce casino iconography: no felt texture, no gold trim, no card-suite decorations, no dice.
- **Don't** use Unicode glyphs as icons (☆/★/etc.) — draw them.
- **Don't** fill panels with color or gradient; they are drawn frames.
- **Don't** use easing with overshoot/bounce; chalk strokes decelerate smoothly (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Don't** let a third full color past the pasteboard rule.
