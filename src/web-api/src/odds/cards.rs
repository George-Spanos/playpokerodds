//! Cards: u8-backed rank/suit, ported from src/core calculator/types.ts.

pub const UNKNOWN_CARD: &str = "..";

/// 2..=14 (ace high), matching Ranks enum.
pub const RANKS: [u8; 13] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
/// 1..=4: club, diamond, heart, spade — matching Suits enum.
pub const SUITS: [u8; 4] = [1, 2, 3, 4];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Card {
    pub rank: u8,
    pub suit: u8,
}

impl Card {
    /// Parse "As", "Td", "2c" — same charset as Card.validateCardString.
    pub fn parse(s: &str) -> Option<Card> {
        let bytes = s.as_bytes();
        if bytes.len() != 2 {
            return None;
        }
        let rank = match bytes[0] {
            b'T' => 10,
            b'J' => 11,
            b'Q' => 12,
            b'K' => 13,
            b'A' => 14,
            b'2'..=b'9' => bytes[0] - b'0',
            _ => return None,
        };
        let suit = match bytes[1] {
            b'c' => 1,
            b'd' => 2,
            b'h' => 3,
            b's' => 4,
            _ => return None,
        };
        Some(Card { rank, suit })
    }
}

impl std::fmt::Display for Card {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let rank = match self.rank {
            10 => 'T',
            11 => 'J',
            12 => 'Q',
            13 => 'K',
            14 => 'A',
            r => (b'0' + r) as char,
        };
        let suit = match self.suit {
            1 => 'c',
            2 => 'd',
            3 => 'h',
            4 => 's',
            _ => unreachable!(),
        };
        write!(f, "{rank}{suit}")
    }
}

/// Parse a comma-separated card group ("5c,Th"). Returns None on any bad card.
pub fn parse_card_group(s: &str) -> Option<Vec<Card>> {
    if s.is_empty() {
        return Some(vec![]);
    }
    s.split(',').map(Card::parse).collect()
}

/// String-form card validation matching poker-core validateCard: 2-char rank+suit.
pub fn is_valid_card(s: &str) -> bool {
    Card::parse(s).is_some() || s == UNKNOWN_CARD
}

/// Fixed rank-major 52-card deck, matching Deck constructor: 2c,2d,2h,2s,3c…
pub fn full_deck() -> Vec<Card> {
    let mut deck = Vec::with_capacity(52);
    for rank in RANKS {
        for suit in SUITS {
            deck.push(Card { rank, suit });
        }
    }
    deck
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_round_trip() {
        for s in ["2c", "9d", "Th", "Js", "Qc", "Kd", "As"] {
            let c = Card::parse(s).unwrap();
            assert_eq!(c.to_string(), s);
        }
    }

    #[test]
    fn parse_rejects_bad() {
        for s in ["10s", "1s", "Bc", "Ax", "Asx", ""] {
            assert!(Card::parse(s).is_none(), "{s}");
        }
    }

    #[test]
    fn deck_order_matches_ts() {
        let deck = full_deck();
        assert_eq!(deck.len(), 52);
        // suits ascend in value: c(1), d(2), h(3), s(4) — "2c,2d,2h,2s,3c,..."
        // deck is suit-major: index = rank_idx * 4 + suit_idx
        assert_eq!(deck[0].to_string(), "2c");
        assert_eq!(deck[3].to_string(), "2s");
        assert_eq!(deck[4].to_string(), "3c");
        assert_eq!(deck[51].to_string(), "As");
    }
}
