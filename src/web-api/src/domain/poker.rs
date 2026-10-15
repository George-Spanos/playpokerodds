//! Poker round domain ported from @moby-it/poker-core (src/core/src).
//! Behavior parity is contract-tested against the TS implementation's tests.

use rand::Rng;
use serde::{Deserialize, Serialize};

pub const RANKS: [&str; 13] = [
    "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
];
pub const SUITS: [&str; 4] = ["s", "h", "c", "d"];

pub const UNKNOWN_CARD: &str = "..";

/// Fixed-order 52-card deck (As..2s, Ah..2h, Ac..2c, Ad..2d), matching createDeck.ts.
pub fn create_deck() -> Vec<String> {
    let mut deck = Vec::with_capacity(52);
    for suit in SUITS {
        for rank in RANKS {
            deck.push(format!("{rank}{suit}"));
        }
    }
    deck
}

pub fn is_valid_card(payload: &str) -> bool {
    if payload == UNKNOWN_CARD {
        return true;
    }
    if payload.len() != 2 {
        return false;
    }
    let (rank, suit) = (payload[0..1].to_string(), payload[1..2].to_string());
    RANKS.contains(&rank.as_str()) && SUITS.contains(&suit.as_str())
}

/// Hand = exactly 2 distinct cards, or the ['..','..'] unknown pair. Matches validateHand.
pub fn is_valid_hand(payload: &[String]) -> bool {
    payload.len() == 2
        && is_valid_card(&payload[0])
        && is_valid_card(&payload[1])
        && (payload[0] != payload[1] || (payload[0] == UNKNOWN_CARD && payload[1] == UNKNOWN_CARD))
}

/// Board = 0, 3, 4, or 5 valid cards. Matches validateBoard.
pub fn is_valid_board(payload: &[String]) -> bool {
    (payload.is_empty() || payload.len() == 3 || payload.len() == 4 || payload.len() == 5)
        && payload.iter().all(|c| is_valid_card(c))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Round {
    #[serde(rename = "myHand")]
    pub my_hand: Vec<String>,
    #[serde(rename = "opponentsHands")]
    pub opponents_hands: Vec<Vec<String>>,
    pub board: Vec<String>,
}

/// Structural validation + cross-round duplicate check. Matches validateRound.
pub fn validate_round(round: &Round) -> bool {
    if !is_valid_hand(&round.my_hand)
        || round.opponents_hands.is_empty()
        || round.opponents_hands.len() > 8
        || !round.opponents_hands.iter().all(|h| is_valid_hand(h))
        || !is_valid_board(&round.board)
    {
        return false;
    }
    let mut cards: Vec<&str> = round
        .my_hand
        .iter()
        .chain(round.opponents_hands.iter().flatten())
        .map(|s| s.as_str())
        .filter(|c| *c != UNKNOWN_CARD)
        .collect();
    cards.sort_unstable();
    cards.dedup();
    // after dedup, length only shrinks when duplicates existed
    let original = round
        .my_hand
        .iter()
        .chain(round.opponents_hands.iter().flatten())
        .filter(|c| c.as_str() != UNKNOWN_CARD)
        .count();
    original == cards.len()
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[repr(i32)]
pub enum BoardState {
    PreFlop = 0,
    Flop = 1,
    Turn = 2,
    River = 3,
}

impl BoardState {
    pub fn from_i32(v: i32) -> Option<Self> {
        match v {
            0 => Some(BoardState::PreFlop),
            1 => Some(BoardState::Flop),
            2 => Some(BoardState::Turn),
            3 => Some(BoardState::River),
            _ => None,
        }
    }

    /// Cards opened per state. Matches openBoardCardsFromState.
    pub fn open_board_cards(self) -> usize {
        match self {
            BoardState::PreFlop => 0,
            BoardState::Flop => 3,
            BoardState::Turn => 4,
            BoardState::River => 5,
        }
    }
}

/// Draws a random card, removing it from the deck. Matches generateCardAndRemoveFromDeck.
fn generate_card_and_remove_from_deck(deck: &mut Vec<String>, rng: &mut impl Rng) -> String {
    let idx = rng.gen_range(0..deck.len());
    deck.remove(idx)
}

/// generateHand: 2 cards off the deck.
fn generate_hand(deck: &mut Vec<String>, rng: &mut impl Rng) -> Vec<String> {
    vec![
        generate_card_and_remove_from_deck(deck, rng),
        generate_card_and_remove_from_deck(deck, rng),
    ]
}

/// Port of core's range() including its quirks: inclusive of both ends for
/// positive diffs, and for end < start it emits [start, start-1, ...] with one
/// extra entry (Array(abs(diff)+1)). createRandomRound depends on the
/// end<start case: range(1, 0) = [1, 0], which is why a totalHands=1 random
/// round deals TWO opponent hands (index 0 satisfies `<= totalKnownHands`).
fn range_ts(start: usize, end: isize) -> Vec<usize> {
    let diff = end - start as isize;
    if diff == 0 {
        return vec![start];
    }
    (0..=diff.unsigned_abs())
        .map(|x| {
            let increment = if end > start as isize { x as isize } else { -(x as isize) };
            (start as isize + increment) as usize
        })
        .collect()
}

/// generateHands: index <= totalKnownHands deals a hand, otherwise ['..','..'].
fn generate_hands(
    total_hands: usize,
    total_known_hands: usize,
    deck: &mut Vec<String>,
    rng: &mut impl Rng,
) -> Vec<Vec<String>> {
    range_ts(1, total_hands as isize)
        .into_iter()
        .map(|index| {
            if index <= total_known_hands {
                generate_hand(deck, rng)
            } else {
                vec![UNKNOWN_CARD.to_string(), UNKNOWN_CARD.to_string()]
            }
        })
        .collect()
}

/// createRound: deal my hand, opponents, and board from a fresh deck.
/// TS parity: opponentsHands = generateHands(totalHands - 1, totalKnownHands).
pub fn create_round(
    total_hands: usize,
    total_known_hands: usize,
    board_state: BoardState,
    rng: &mut impl Rng,
) -> Round {
    let mut deck = create_deck();
    let my_hand = generate_hand(&mut deck, rng);
    let opponents_hands =
        generate_hands(total_hands.saturating_sub(1), total_known_hands, &mut deck, rng);
    let board: Vec<String> = if board_state == BoardState::PreFlop {
        vec![]
    } else {
        (0..board_state.open_board_cards())
            .map(|_| generate_card_and_remove_from_deck(&mut deck, rng))
            .collect()
    };
    Round {
        my_hand,
        opponents_hands,
        board,
    }
}

/// createRandomRound: totalHands = randomInt(1, 8) (exclusive max → 1..=7),
/// totalKnownHands = 0, boardState = randomInt(0, 3) (→ 0..=2, never River).
pub fn create_random_round(rng: &mut impl Rng) -> Round {
    let total_hands = rng.gen_range(1..8);
    let total_known_hands = 0;
    let board_state_int = rng.gen_range(0..3);
    let board_state = BoardState::from_i32(board_state_int).expect("board state in range");
    create_round(total_hands, total_known_hands, board_state, rng)
}

/// calculateGuessScore: |estimate − odds| rounded to 2 decimals. Matches calculate-guess-accuracy.ts.
pub fn calculate_guess_score(estimate: f64, hand_odds: f64) -> f64 {
    let diff = (estimate - hand_odds).round_to_two_dp();
    diff.abs()
}

trait Round2Dp {
    fn round_to_two_dp(self) -> f64;
}

impl Round2Dp for f64 {
    fn round_to_two_dp(self) -> f64 {
        (self * 100.0).round() / 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deck_is_fixed_order_52() {
        let deck = create_deck();
        assert_eq!(deck.len(), 52);
        assert_eq!(deck[0], "As");
        assert_eq!(deck[13], "Ah");
        assert_eq!(deck[26], "Ac");
        assert_eq!(deck[51], "2d");
    }

    #[test]
    fn card_validation() {
        assert!(is_valid_card("As"));
        assert!(is_valid_card("2d"));
        assert!(is_valid_card(".."));
        assert!(!is_valid_card("10s"));
        assert!(!is_valid_card("15A"));
        assert!(!is_valid_card("Bc"));
        assert!(!is_valid_card(""));
    }

    #[test]
    fn hand_validation() {
        let valid = vec!["Td".to_string(), "2s".to_string()];
        assert!(is_valid_hand(&valid));
        let duplicate = vec!["2h".to_string(), "2h".to_string()];
        assert!(!is_valid_hand(&duplicate));
        let unknown = vec!["..".to_string(), "..".to_string()];
        assert!(is_valid_hand(&unknown));
        // TS validateHand passes mixed unknown/real hands: both "cards" valid
        // and distinct; round-level dedup never sees duplicates here.
        let mixed = vec!["..".to_string(), "2h".to_string()];
        assert!(is_valid_hand(&mixed));
        let three = vec!["2h".to_string(), "2s".to_string(), "2c".to_string()];
        assert!(!is_valid_hand(&three));
    }

    #[test]
    fn board_validation() {
        assert!(is_valid_board(&[]));
        let flop = vec!["Ac".to_string(), "3s".to_string(), "Th".to_string()];
        assert!(is_valid_board(&flop));
        let six = vec![
            "Ac".to_string(),
            "3s".to_string(),
            "Th".to_string(),
            "2d".to_string(),
            "5c".to_string(),
            "6h".to_string(),
        ];
        assert!(!is_valid_board(&six));
        let bad = vec!["Bc".to_string()];
        assert!(!is_valid_board(&bad));
    }

    #[test]
    fn round_rejects_duplicate_cards() {
        let round = Round {
            my_hand: vec!["Ac".to_string(), "Kd".to_string()],
            opponents_hands: vec![vec!["Ac".to_string(), "Kd".to_string()]],
            board: vec![],
        };
        assert!(!validate_round(&round));
    }

    #[test]
    fn round_rejects_three_card_hand() {
        let round = Round {
            my_hand: vec!["Ac".to_string(), "Kd".to_string(), "3c".to_string()],
            opponents_hands: vec![vec!["..".to_string(), "..".to_string()]],
            board: vec![],
        };
        assert!(!validate_round(&round));
    }

    #[test]
    fn round_rejects_unparsable_opponent() {
        let round = Round {
            my_hand: vec!["Ac".to_string(), "Kd".to_string()],
            opponents_hands: vec![vec!["fasolaki".to_string(), "..".to_string()]],
            board: vec![],
        };
        assert!(!validate_round(&round));
    }

    #[test]
    fn round_rejects_no_opponents() {
        let round = Round {
            my_hand: vec!["Ac".to_string(), "Kd".to_string()],
            opponents_hands: vec![],
            board: vec![],
        };
        assert!(!validate_round(&round));
    }

    #[test]
    fn generated_rounds_always_valid() {
        let mut rng = rand::thread_rng();
        for state in 0..=3 {
            for hands in 2..=9 {
                for known in 0..=hands {
                    let bs = BoardState::from_i32(state).unwrap();
                    let round = create_round(hands, known, bs, &mut rng);
                    assert!(
                        validate_round(&round),
                        "invalid round: state={state} hands={hands} known={known} round={round:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn board_sizes_match_state() {
        let mut rng = rand::thread_rng();
        for (state, size) in [
            (BoardState::PreFlop, 0),
            (BoardState::Flop, 3),
            (BoardState::Turn, 4),
            (BoardState::River, 5),
        ] {
            let round = create_round(2, 2, state, &mut rng);
            assert_eq!(round.board.len(), size);
        }
    }

    #[test]
    fn guess_score_two_dp() {
        assert_eq!(calculate_guess_score(50.0, 47.04), 2.96);
        assert_eq!(calculate_guess_score(13.64, 13.64), 0.0);
        assert_eq!(calculate_guess_score(40.0, 13.64), 26.36);
    }
}
