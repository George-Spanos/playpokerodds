//! 7-card hand evaluator — 1:1 port of src/core/calculate-odds/calculator/evaluate.ts.
//! Returns (category, tiebreaks[5]); comparison is lexicographic on the pair,
//! which produces the same winner as the TS sorted-card comparison.

use crate::odds::cards::Card;
use std::collections::HashMap;

pub const HIGH_CARD: u8 = 1;
pub const PAIR: u8 = 2;
pub const TWO_PAIR: u8 = 3;
pub const TRIPS: u8 = 4;
pub const STRAIGHT: u8 = 5;
pub const FLUSH: u8 = 6;
pub const FULL_HOUSE: u8 = 7;
pub const QUADS: u8 = 8;
pub const STRAIGHT_FLUSH: u8 = 9;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BestHand {
    pub category: u8,
    pub tiebreaks: [u8; 5],
}

impl Ord for BestHand {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.category, &self.tiebreaks).cmp(&(other.category, &other.tiebreaks))
    }
}

impl PartialOrd for BestHand {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl BestHand {
    pub fn cmp_ts(&self, other: &Self) -> std::cmp::Ordering {
        self.cmp(other)
    }
}

/// evaluate(): 5–7 cards, any order.
pub fn evaluate(cards: &mut [Card]) -> BestHand {
    // TS sortDesc: two stable sorts — by suit desc, then rank desc
    // (net effect: rank desc, suit desc within rank).
    cards.sort_by_key(|c| std::cmp::Reverse(c.suit));
    cards.sort_by_key(|c| std::cmp::Reverse(c.rank));

    // rank counts keyed by rank value; TS Object.keys order is numeric-ascending,
    // then .reverse() gives descending rank for the walk.
    let mut rank_count: HashMap<u8, u8> = HashMap::new();
    for c in cards.iter() {
        *rank_count.entry(c.rank).or_insert(0) += 1;
    }
    let mut all_ranks: Vec<u8> = rank_count.keys().copied().collect();
    all_ranks.sort_unstable(); // ascending like TS numeric keys
    all_ranks.reverse(); // descending walk order

    let mut quad_ranks: Vec<u8> = vec![];
    let mut trip_ranks: Vec<u8> = vec![];
    let mut pair_ranks: Vec<u8> = vec![];
    let mut straight_cards_count: u8 = 0;
    let mut straight_max_card_rank: u8 = 0;
    let mut straight_last_card_rank: u8 = 0;

    for &rank in &all_ranks {
        match rank_count[&rank] {
            2 => pair_ranks.push(rank),
            3 => trip_ranks.push(rank),
            4 => quad_ranks.push(rank),
            _ => {}
        }
        if straight_cards_count < 5 {
            if straight_last_card_rank != 0 && straight_last_card_rank - 1 == rank {
                straight_cards_count += 1;
                straight_last_card_rank = rank;
            } else {
                straight_max_card_rank = rank;
                straight_last_card_rank = rank;
                straight_cards_count = 1;
            }
        }
    }

    // flush suit: first suit (in suit-value ascending order, matching TS numeric keys)
    // with >= 5 cards
    let mut suit_count: HashMap<u8, u8> = HashMap::new();
    for c in cards.iter() {
        *suit_count.entry(c.suit).or_insert(0) += 1;
    }
    let mut flush_suit: u8 = 0;
    for suit in crate::odds::cards::SUITS {
        if suit_count.get(&suit).copied().unwrap_or(0) >= 5 {
            flush_suit = suit;
            break;
        }
    }

    // straight flush
    if flush_suit != 0 {
        if straight_cards_count == 5 {
            let sf_cards: Vec<Card> = cards
                .iter()
                .filter(|c| c.suit == flush_suit && c.rank <= straight_max_card_rank)
                .copied()
                .collect();
            if sf_cards.len() >= 5 {
                let mut index = 0;
                let mut count = 1;
                let mut is_straight_flush = false;
                for i in 1..sf_cards.len() {
                    if sf_cards[i].rank != sf_cards[i - 1].rank - 1 {
                        index = i;
                        count = 1;
                    } else {
                        count += 1;
                    }
                    if count == 5 {
                        is_straight_flush = true;
                        break;
                    }
                }
                if is_straight_flush {
                    return BestHand {
                        category: STRAIGHT_FLUSH,
                        tiebreaks: tiebreaks_from(&sf_cards[index..index + 5]),
                    };
                }
            }
        } else if straight_cards_count == 4 && straight_max_card_rank == 5 {
            // wheel: ace + the 4 flush cards ≤ 5
            let ace_in_flush = cards
                .iter()
                .any(|c| c.suit == flush_suit && c.rank == 14);
            if ace_in_flush {
                let low_cards: Vec<Card> = cards
                    .iter()
                    .filter(|c| c.suit == flush_suit && c.rank <= straight_max_card_rank)
                    .copied()
                    .collect();
                if low_cards.len() == 4 {
                    let ace = *cards.iter().find(|c| c.suit == flush_suit && c.rank == 14).unwrap();
                    let mut hand = low_cards;
                    hand.push(ace);
                    hand.truncate(5);
                    return BestHand { category: STRAIGHT_FLUSH, tiebreaks: tiebreaks_from(&hand) };
                }
            }
        }
    }

    // quads
    if !quad_ranks.is_empty() {
        let q = quad_ranks[0];
        let quad_cards: Vec<Card> = cards.iter().filter(|c| c.rank == q).copied().collect();
        let others: Vec<Card> = cards.iter().filter(|c| c.rank != q).copied().collect();
        let mut hand = quad_cards;
        hand.extend(others);
        hand.truncate(5);
        return BestHand { category: QUADS, tiebreaks: tiebreaks_from(&hand) };
    }

    // full house
    if trip_ranks.len() == 1 && !pair_ranks.is_empty() {
        let t = trip_ranks[0];
        let p = pair_ranks[0];
        let trips: Vec<Card> = cards.iter().filter(|c| c.rank == t).copied().collect();
        let pairs: Vec<Card> = cards.iter().filter(|c| c.rank == p).copied().collect();
        let mut hand = trips;
        hand.extend(pairs);
        return BestHand { category: FULL_HOUSE, tiebreaks: tiebreaks_from(&hand) };
    } else if trip_ranks.len() > 1 {
        // second trip used as the pair
        let t0 = trip_ranks[0];
        let t1 = trip_ranks[1];
        let trips: Vec<Card> = cards.iter().filter(|c| c.rank == t0).copied().collect();
        let second_trip: Vec<Card> = cards.iter().filter(|c| c.rank == t1).copied().collect();
        let mut hand = trips;
        hand.extend(second_trip.into_iter().take(2));
        return BestHand { category: FULL_HOUSE, tiebreaks: tiebreaks_from(&hand) };
    }

    // flush
    if flush_suit != 0 {
        let flush_cards: Vec<Card> = cards.iter().filter(|c| c.suit == flush_suit).copied().collect();
        return BestHand {
            category: FLUSH,
            tiebreaks: tiebreaks_from(&flush_cards[..5]),
        };
    }

    // straight
    if straight_cards_count == 5 {
        let candidates: Vec<Card> = cards
            .iter()
            .filter(|c| c.rank <= straight_max_card_rank)
            .copied()
            .collect();
        let uniq = uniq_by_rank(candidates);
        return BestHand {
            category: STRAIGHT,
            tiebreaks: tiebreaks_from(&uniq[..5]),
        };
    } else if straight_cards_count == 4 && straight_max_card_rank == 5 {
        let has_ace = cards.iter().any(|c| c.rank == 14);
        if has_ace {
            let candidates: Vec<Card> = cards
                .iter()
                .filter(|c| c.rank <= straight_max_card_rank)
                .copied()
                .collect();
            let mut uniq = uniq_by_rank(candidates);
            let ace = *cards.iter().find(|c| c.rank == 14).unwrap();
            uniq.push(ace);
            return BestHand {
                category: STRAIGHT,
                tiebreaks: tiebreaks_from(&uniq[..5]),
            };
        }
    }

    // trips
    if trip_ranks.len() == 1 {
        let t = trip_ranks[0];
        let trip_cards: Vec<Card> = cards.iter().filter(|c| c.rank == t).copied().collect();
        let rest: Vec<Card> = cards.iter().filter(|c| c.rank != t).copied().collect();
        let mut hand = trip_cards;
        hand.extend(rest);
        hand.truncate(5);
        return BestHand { category: TRIPS, tiebreaks: tiebreaks_from(&hand) };
    }

    // two pair
    if pair_ranks.len() >= 2 {
        let p0 = pair_ranks[0];
        let p1 = pair_ranks[1];
        let higher: Vec<Card> = cards.iter().filter(|c| c.rank == p0).copied().collect();
        let lower: Vec<Card> = cards.iter().filter(|c| c.rank == p1).copied().collect();
        let unpaired: Vec<Card> = cards
            .iter()
            .filter(|c| c.rank != p0 && c.rank != p1)
            .copied()
            .collect();
        let mut hand = higher;
        hand.extend(lower);
        hand.extend(unpaired);
        hand.truncate(5);
        return BestHand { category: TWO_PAIR, tiebreaks: tiebreaks_from(&hand) };
    }

    // pair
    if pair_ranks.len() == 1 {
        let p = pair_ranks[0];
        let paired: Vec<Card> = cards.iter().filter(|c| c.rank == p).copied().collect();
        let rest: Vec<Card> = cards.iter().filter(|c| c.rank != p).copied().collect();
        let mut hand = paired;
        hand.extend(rest);
        hand.truncate(5);
        return BestHand { category: PAIR, tiebreaks: tiebreaks_from(&hand) };
    }

    // high card
    BestHand { category: HIGH_CARD, tiebreaks: tiebreaks_from(cards) }
}

/// uniqWith(rank equality) — keeps first occurrence, preserving sort order.
fn uniq_by_rank(cards: Vec<Card>) -> Vec<Card> {
    let mut out: Vec<Card> = vec![];
    for c in cards {
        if !out.iter().any(|u| u.rank == c.rank) {
            out.push(c);
        }
    }
    out
}

/// Tiebreaks: 5 ranks in hand order (already sorted desc by the caller's card
/// order), zero-padded. Comparison mirrors Player.compare(): first differing
/// rank decides; equal ranks tie.
fn tiebreaks_from(hand: &[Card]) -> [u8; 5] {
    let mut t = [0u8; 5];
    for (i, c) in hand.iter().take(5).enumerate() {
        t[i] = c.rank;
    }
    t
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::odds::cards::Card;

    fn parse(hand: &str) -> Vec<Card> {
        hand.split(',').map(Card::parse).collect::<Option<Vec<_>>>().unwrap()
    }

    fn cat(cards: &str) -> BestHand {
        evaluate(&mut parse(cards))
    }

    #[test]
    fn high_card() {
        let h = cat("2c,5d,7h,9s,Jc");
        assert_eq!(h.category, HIGH_CARD);
        assert_eq!(h.tiebreaks, [11, 9, 7, 5, 2]);
    }

    #[test]
    fn pair_beats_high() {
        let pair = cat("2c,2d,5h,7s,9c");
        let high = cat("Ac,Kd,Qh,Js,9c");
        assert!(pair.category > high.category);
        assert_eq!(pair.tiebreaks[0], 2);
    }

    #[test]
    fn kicker_comparison() {
        let a = cat("Ac,Ad,7h,8s,9c");
        let b = cat("Kc,Kd,Ah,8s,9c");
        assert!(a > b, "pair of aces with A-kicker beats kings");
        // pair vs pair decided by pair rank first
        assert!(b.cmp(&a) == std::cmp::Ordering::Less);
    }

    #[test]
    fn wheel_straight() {
        // A,2,3,4,5 — ace-low straight, straight_max rank is 5
        let h = cat("Ac,2d,3h,4s,5c,Kd,Kh");
        assert_eq!(h.category, STRAIGHT);
        // tiebreaks lead with the 5 (top of the wheel)
        assert_eq!(h.tiebreaks[0], 5);
    }

    #[test]
    fn flush_beats_straight() {
        let flush = cat("2h,5h,7h,9h,Kh");
        let straight = cat("6c,7d,8h,9s,Tc");
        assert!(flush.category > straight.category);
    }

    #[test]
    fn full_house_two_trips() {
        // three 2s and three 3s: trips of the higher rank (3) + pair from the 2s
        let h = cat("2c,2d,2h,3c,3d,3h,As");
        assert_eq!(h.category, FULL_HOUSE);
        // hand keeps all 5 cards (3 trips + pair); tiebreaks = the five ranks
        assert_eq!(h.tiebreaks, [3, 3, 3, 2, 2]);
    }

    #[test]
    fn quads() {
        let h = cat("9c,9d,9h,9s,Ac,Kd,2h");
        assert_eq!(h.category, QUADS);
        assert_eq!(h.tiebreaks, [9, 9, 9, 9, 14]);
    }

    #[test]
    fn straight_flush() {
        let h = cat("5h,6h,7h,8h,9h,Ah,Kc");
        assert_eq!(h.category, STRAIGHT_FLUSH);
        assert_eq!(h.tiebreaks[0], 9);
    }

    #[test]
    fn wheel_flush_straight() {
        // 6h on board: the 6-high straight flush outranks the wheel — TS engine
        // verified by simulation: sc=5, smax=6, sf path yields [6h,5h,4h,3h,2h].
        let h = cat("Ah,2h,3h,4h,5h,6h,Kc");
        assert_eq!(h.category, STRAIGHT_FLUSH);
        assert_eq!(h.tiebreaks[0], 6);

        // true wheel flush: no 6h, five hearts A-5 + two junk cards.
        // sc=4 smax=5 with ace in flush → wheel path, hand = [5h,4h,3h,2h,Ah].
        let h2 = cat("Ah,2h,3h,4h,5h,Kc,Qd");
        // hearts: Ah,2h,3h,4h,5h = 5 hearts → flush; straight run 5..2 = 4 (ace not adjacent in walk),
        // smax=5 → wheel path applies
        assert_eq!(h2.category, STRAIGHT_FLUSH);
        assert_eq!(h2.tiebreaks[0], 5);
    }

    #[test]
    fn seven_cards_best_five() {
        // pair of aces + junk: kickers take the best 3 remaining
        let h = cat("Ac,Ad,2h,3s,5c,7d,9h");
        assert_eq!(h.category, PAIR);
        assert_eq!(h.tiebreaks, [14, 14, 9, 7, 5]);
    }
}
