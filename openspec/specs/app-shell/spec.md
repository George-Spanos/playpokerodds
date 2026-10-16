# app-shell Specification

## Purpose
The app shell is the persistent top navigation (brand, primary nav links, signed-in status/sign-in link) shown on every surface. It must remain legible and non-overflowing on narrow mobile viewports.

## Requirements

### Requirement: Responsive header down to 360px
The header SHALL present the brand, nav links, and user status legibly on viewports from 360px upward, without horizontal page scroll caused by the header and without clipped or colliding text.

#### Scenario: Logo legibility on a 360px viewport
- **WHEN** the app is viewed at a 360px-wide viewport
- **THEN** the full brand text "Play Poker Odds!" is readable (wrapped or scaled, not clipped or overlapped by other nav items)

#### Scenario: Sign-in affordance on mobile
- **WHEN** an anonymous user views any page at a 360px-wide viewport
- **THEN** the sign-in link is visible, tappable (≥44px touch target), and not truncated or colliding with other header content

#### Scenario: No header-induced horizontal scroll
- **WHEN** any surface is rendered at viewports between 360px and 430px wide
- **THEN** the header produces no horizontal page overflow
