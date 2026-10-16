# play-guess-rail Specification

## Purpose
The play surface's guess rail: a 0–100% slider with a synced numeric text entry, and reveal feedback that marks the true odds position with a labeled marker instead of decorative circles.

## Requirements

### Requirement: Numeric text entry synced with the slider
The guess panel SHALL offer a numeric text input bound to the same value as the slider; editing either control updates the other and the committed estimate, with values clamped to 0–100.

#### Scenario: Editing the number moves the slider
- **WHEN** the user types `37` into the numeric input
- **THEN** the slider thumb and the displayed estimate show 37, and submitting commits 37

#### Scenario: Out-of-range input is clamped
- **WHEN** the user types `140` into the numeric input
- **THEN** the stored estimate is clamped to 100 on commit; while typing, the input is not silently rewritten mid-edit

#### Scenario: Slider updates the number
- **WHEN** the user drags the slider to 62
- **THEN** the numeric input shows 62

### Requirement: Reveal feedback is a labeled truth marker
On reveal, the rail SHALL mark the true odds position with the correct percentage rendered as small highlighted text at that position; decorative circle/burst overlays around the guess SHALL NOT be shown.

#### Scenario: Truth label after reveal
- **WHEN** the answer is revealed with true odds 44%
- **THEN** a marker at the 44% position on the rail displays "44" (small font, highlighted color), distinct from the user's guess thumb

#### Scenario: No circle or burst decorations
- **WHEN** the answer is revealed (whether the guess was close or far)
- **THEN** no chalk-circle or chalk-burst element is rendered on the rail

### Requirement: Rail drag does not scroll the page on touch
Dragging the rail on a touch device SHALL change the estimate without scrolling the page.

#### Scenario: Touch drag on the rail
- **WHEN** the user drags the rail on a touchscreen
- **THEN** the estimate follows the touch and the page does not scroll horizontally or vertically from that gesture
