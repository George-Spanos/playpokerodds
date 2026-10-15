//! Game + Calculator — port of Game.ts and Calculator.ts.
//! Simulation semantics: fixed-order deck, Fisher-Yates shuffle, known-card
//! removal, exhaustive enumeration when exact, Monte Carlo with
//! shuffle-before-compare tie handling.

use crate::odds::cards::{full_deck, Card};
use crate::odds::evaluate::{evaluate, BestHand};
use rand::Rng;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Input {
    pub num_players: usize,
    pub hands: Vec<String>,
    pub board: String,
    pub board_size: usize,
    pub num_decks: usize,
    pub iterations: usize,
}

impl Default for Input {
    fn default() -> Self {
        // cleanInput defaults
        Input {
            num_players: 0,
            hands: vec![],
            board: String::new(),
            board_size: 5,
            num_decks: 1,
            iterations: 1000,
        }
    }
}

#[derive(Debug)]
pub struct Stats {
    /// name -> (winCount, tieCount), in TS insertion order (hands then NPCs)
    pub counts: Vec<(String, u64, u64)>,
    pub iterations: u64,
}

impl Stats {
    pub fn win_percent(&self, name: &str) -> Option<f64> {
        let total = self.iterations as f64;
        self.counts
            .iter()
            .find(|(n, _, _)| n == name)
            .map(|(_, w, _)| round4((*w as f64 / total) * 100.0))
    }
}

fn round4(v: f64) -> f64 {
    (v * 10000.0).round() / 10000.0
}

/// calculateMaxIterations: product over hidden cards of remaining-deck choices.
pub fn calculate_max_iterations(input: &Input) -> u128 {
    let board_length = input.board.split(',').filter(|s| !s.is_empty()).count();
    let known_hands = input.hands.len();
    let hidden_board = input.board_size.saturating_sub(board_length);
    let hidden_players = (input.num_players.saturating_sub(known_hands)) * 2;
    let hidden_cards = hidden_board + hidden_players;
    let remaining_deck = 52 - board_length - known_hands * 2;
    let mut max: u128 = 1;
    for i in 0..hidden_cards {
        max *= (remaining_deck - i) as u128;
    }
    max
}

fn npc_name(i: usize) -> String {
    format!("NPC {i}")
}

struct Player {
    name: String,
    dealt: Vec<Card>,
    best: Option<BestHand>,
}

impl Player {
    fn evaluate_hand(&mut self, board: &[Card]) {
        let mut total = self.dealt.clone();
        total.extend(board.iter().copied());
        self.best = Some(evaluate(&mut total));
    }
}

pub fn play_pub(input: &Input, rng: &mut impl Rng) -> Vec<String> {
    play(input, None, rng)
}

fn play(input: &Input, extra_board: Option<&[Card]>, rng: &mut impl Rng) -> Vec<String> {
    let mut deck = full_deck();

    // Game constructor: shuffle the deck before dealing (Fisher-Yates)
    for i in (1..deck.len()).rev() {
        let j = rng.gen_range(0..=i);
        deck.swap(i, j);
    }

    // buildKnownBoard: remove + fix known board cards
    let board_cards = crate::odds::cards::parse_card_group(&input.board).unwrap_or_default();
    let mut board: Vec<Card> = board_cards.clone();
    for c in &board_cards {
        remove_card(&mut deck, *c);
    }

    // dealKnownCards
    let mut players: Vec<Player> = vec![];
    for h in &input.hands {
        let dealt = crate::odds::cards::parse_card_group(h).unwrap_or_default();
        for c in &dealt {
            remove_card(&mut deck, *c);
        }
        players.push(Player { name: dealt_to_string(&dealt), dealt, best: None });
    }

    // buildRestOfBoard: fixed extra cards (exhaustive path) or draw
    let current = board.len();
    for i in 0..input.board_size.saturating_sub(current) {
        match extra_board {
            Some(extra) => board.push(extra[i]),
            None => board.push(deck.pop().expect("deck empty")),
        }
    }

    // dealRestOfCards
    for p in &mut players {
        while p.dealt.len() < 2 {
            p.dealt.push(deck.pop().expect("deck empty"));
        }
    }
    for i in 0..input.num_players.saturating_sub(input.hands.len()) {
        let mut dealt = vec![];
        for _ in 0..2 {
            dealt.push(deck.pop().expect("deck empty"));
        }
        players.push(Player { name: npc_name(i + 1), dealt, best: None });
    }

    // evaluate all
    for p in &mut players {
        p.evaluate_hand(&board);
    }

    // shuffle players (tie bias), then sort best-first
    for i in (1..players.len()).rev() {
        let j = rng.gen_range(0..=i);
        players.swap(i, j);
    }
    players.sort_by(|a, b| {
        let (ba, bb) = (a.best.as_ref().unwrap(), b.best.as_ref().unwrap());
        bb.cmp(ba)
    });

    // winners: best player plus all ties (compare adjacent, TS Player.compare)
    let mut winners = vec![players[0].name.clone()];
    for i in 1..players.len() {
        let cmp = players[i - 1].best.as_ref().unwrap().cmp(players[i].best.as_ref().unwrap());
        if cmp == std::cmp::Ordering::Equal {
            winners.push(players[i].name.clone());
        } else {
            break;
        }
    }
    winners
}

/// addToCount: len>1 → tieCount for each winner; else winCount for the winner.
fn bump(counts: &mut HashMap<String, (u64, u64)>, winners: &[String]) {
    for w in winners {
        let entry = counts.get_mut(w).expect("stat key exists");
        if winners.len() > 1 {
            entry.1 += 1;
        } else {
            entry.0 += 1;
        }
    }
}

fn dealt_to_string(dealt: &[Card]) -> String {
    dealt.iter().map(|c| c.to_string()).collect::<Vec<_>>().join(",")
}

fn remove_card(deck: &mut Vec<Card>, card: Card) {
    if let Some(pos) = deck.iter().position(|c| *c == card) {
        deck.remove(pos);
    }
}

/// simulate(): exact enumeration or Monte Carlo; returns stats with TS parity.
pub fn simulate(input: &Input) -> Stats {
    let mut input = input.clone();
    if input.num_players == 0 {
        input.num_players = input.hands.len();
    }
    if input.iterations == 0 {
        input.iterations = 1000;
    }

    // stats keys in TS insertion order: hands first, then NPCs
    let mut names: Vec<String> = input.hands.clone();
    for i in 0..input.num_players.saturating_sub(input.hands.len()) {
        names.push(npc_name(i + 1));
    }
    let mut counts: Vec<(String, u64, u64)> =
        names.iter().map(|n| (n.clone(), 0, 0)).collect();
    let mut iterations: u64 = 0;

    let max_iterations = calculate_max_iterations(&input);
    let mut rng = rand::thread_rng();

    if max_iterations < input.iterations as u128 {
        // exhaustive: every ordered 1–2 card board completion (ordered pairs
        // double-count turn+river order — same as the TS engine; odds unchanged)
        let mut deck = full_deck();
        let board_cards = crate::odds::cards::parse_card_group(&input.board).unwrap_or_default();
        for c in &board_cards {
            remove_card(&mut deck, *c);
        }
        for h in &input.hands {
            let cards = crate::odds::cards::parse_card_group(h).unwrap_or_default();
            for c in &cards {
                remove_card(&mut deck, *c);
            }
        }
        let board_len = input.board.split(',').filter(|s| !s.is_empty()).count();
        let remaining = 5 - board_len;

        let mut map: HashMap<String, (u64, u64)> =
            names.iter().map(|n| (n.clone(), (0, 0))).collect();

        if remaining == 1 {
            for card in deck.iter() {
                let extra = vec![*card];
                let winners = play(&input, Some(&extra), &mut rng);
                bump(&mut map, &winners);
                iterations += 1;
            }
        } else if remaining == 2 {
            for i in 0..deck.len() {
                for j in 0..deck.len() {
                    if i == j {
                        continue;
                    }
                    let extra = vec![deck[i], deck[j]];
                    let winners = play(&input, Some(&extra), &mut rng);
                    bump(&mut map, &winners);
                    iterations += 1;
                }
            }
        }
        for (name, w, t) in counts.iter_mut() {
            let (win2, tie2) = map.get(name).copied().unwrap_or((0, 0));
            *w = win2;
            *t = tie2;
        }
    } else {
        for _ in 0..input.iterations {
            let winners = play(&input, None, &mut rng);
            for w in &winners {
                let entry = counts.iter_mut().find(|(n, _, _)| n == w).unwrap();
                if winners.len() > 1 {
                    entry.2 += 1; // tieCount
                } else {
                    entry.1 += 1; // winCount
                }
            }
            iterations += 1;
        }
    }

    Stats { counts, iterations }
}
