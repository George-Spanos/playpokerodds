# Odds Calculation Service (Rust)

## Purpose

Defines the Rust port of the odds-calculation service: its HTTP contract and the behavioral parity of the evaluation engine with the original Deno implementation.

## ADDED Requirements

### Requirement: HTTP contract preserved
The service SHALL preserve the oak service's contract: `POST /api/calcOdds` accepts `{ round, estimate? }`, validates the round (2-card hands, `'..'` unknown hands, board 0/3/4/5, no duplicate cards, ≤8 opponents) and returns `{ odds }`; unparseable bodies and invalid rounds get 400; missing/wrong `x-api-key` (when `APIKEY` is set) gets 403 and open access when unset; `GET /liveness` confirms liveness; `PORT` selects the listen port (default 7071).

#### Scenario: valid odds request
- **WHEN** a client POSTs a valid round with a correct API key
- **THEN** the service responds 200 with `{ odds }` where odds is a number rounded to 2 decimals

#### Scenario: invalid requests
- **WHEN** the body is unparseable or the round fails validation
- **THEN** the service responds 400 without computing

#### Scenario: auth gating
- **WHEN** `APIKEY` is set and the `x-api-key` header mismatches
- **THEN** the response is 403; with no `APIKEY` env, any request is accepted

### Requirement: Hand evaluation parity
The Rust evaluator SHALL produce the same winner as the TS evaluator for every 5–7 card set: categories high-card through straight-fluush with identical kickers, including ace-low straights and straight-flushes and correct full-house composition when multiple trips/pairs exist.

#### Scenario: known hand matchups agree with TS engine
- **WHEN** the canonical matchups from the core test suite run through the Rust evaluator (aces vs deuces, AK vs deuces, fixed-board cases with exact expected percentages)
- **THEN** the computed odds match the TS-expected values within the same ±1 tolerance, and exact-enumeration cases match to the 2-decimal exact value

### Requirement: Simulation semantics parity
Monte Carlo runs SHALL replicate the TS engine: deck built in fixed order, known cards removed, Fisher-Yates shuffle, known board/hands honored, remaining board and NPC hands dealt, all players evaluated, players shuffled before comparison (tie bias), ties counted per player, win% = wins/iterations with the same rounding.

#### Scenario: exhaustive path for river decisions
- **WHEN** fewer than 3 board cards remain to be dealt (turn+river already fixed, e.g. 4-card board)
- **THEN** the engine enumerates every completion exactly (no sampling) and the result equals the TS engine's exhaustive result for the same input

#### Scenario: statistical parity on sampled rounds
- **WHEN** 50,000-iteration Monte Carlo runs execute for the core suite's matchups in both engines
- **THEN** results agree within ±1 percentage point

### Requirement: Service runtime parity
The service SHALL listen on the port from `PORT` (default 7071), ship as a small Docker image without Deno, and keep the compose contract (container reachable from web-api at :7071, `ITERATIONS` env supplying the default iteration count when the request doesn't specify one).

#### Scenario: compose bring-up
- **WHEN** `docker compose up` builds and starts the stack
- **THEN** the web-api container computes odds through the Rust calc service and the UI play loop works end-to-end
