//! Monte Carlo odds engine, ported from the original Deno core engine
//! (itself replaced by this Rust implementation).

pub mod cards;
pub mod evaluate;
pub mod simulate;

/// calculateOdds: transformRoundToInput + Calculator + winPercent extraction.
/// Unknown opponent hands ('..,..') are filtered out and replaced by NPC
/// players, matching transformRoundToInput.
pub fn calculate_odds(
    my_hand: &str,
    opponents_known_hands: &[String],
    board: &str,
    num_players: usize,
    iterations: usize,
) -> f64 {
    let mut hands = vec![my_hand.to_string()];
    hands.extend(
        opponents_known_hands
            .iter()
            .filter(|h| h.as_str() != "..,..")
            .cloned(),
    );
    let input = simulate::Input {
        num_players,
        hands,
        board: board.to_string(),
        board_size: 5,
        num_decks: 1,
        iterations,
    };
    let stats = simulate::simulate(&input);
    let pct = stats.win_percent(my_hand).unwrap_or(0.0);
    // TS: parseFloat(result.toFixed(2)) — 2-dp final rounding
    (pct * 100.0).round() / 100.0
}
