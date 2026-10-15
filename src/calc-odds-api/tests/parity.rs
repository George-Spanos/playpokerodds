//! calculateOdds parity tests — the canonical matchups from the core test suite.
//! Tolerances match core's ±1pp statistical assertions; exact cases must match
//! the TS-computed value to the digit.

use ppo_calc_odds_api::calculate_odds;

#[test]
fn aces_vs_deuces_about_82_5() {
    let odds = calculate_odds("Ac,Ad", &["2c,2d".into()], "", 2, 50_000);
    assert!((odds - 82.5).abs() <= 1.0, "odds {odds}");
}

#[test]
fn ace_king_vs_deuces_about_47() {
    let odds = calculate_odds("Ac,Kd", &["2c,2d".into()], "", 2, 50_000);
    assert!((odds - 47.04).abs() <= 1.0, "odds {odds}");
}

#[test]
fn ace_king_vs_random_about_64_4() {
    let odds = calculate_odds("Ac,Kd", &["..,..".into()], "", 2, 50_000);
    assert!((odds - 64.4).abs() <= 1.0, "odds {odds}");
}

#[test]
fn deuce_trey_preflop_board_about_21_7() {
    let odds = calculate_odds("2d,3c", &["..,..".into()], "5s,Ts,4d,Kh", 2, 50_000);
    assert!((odds - 21.7).abs() <= 1.0, "odds {odds}");
}

#[test]
fn exact_six_outs_river_pair() {
    // TS engine: exhaustive (no cards left to deal), exactly 13.64
    let odds = calculate_odds("Qc,4c", &["3d,2h".into()], "9d,5s,7s,2s", 2, 50_000);
    assert!((odds - 13.64).abs() < 0.005, "odds {odds}");
}

#[test]
fn exact_six_outs_another() {
    let odds = calculate_odds("Qs,4c", &["8c,Ks".into()], "Th,6d,Js,2c", 2, 50_000);
    assert!((odds - 13.64).abs() < 0.005, "odds {odds}");
}

#[test]
fn flop_pair_of_queens_exact() {
    let odds = calculate_odds("Qc,8h", &["9d,Jh".into()], "5d,Qd,7h", 2, 50_000);
    assert!((odds - 90.2).abs() < 0.005, "odds {odds}");
}

#[test]
fn reraise_preflop_three_way() {
    // aces vs two random hands — roughly 73% (TS engine value for 3-way)
    let odds = calculate_odds("Ac,Ad", &["..,..".into(), "..,..".into()], "", 3, 50_000);
    assert!((odds - 73.0).abs() <= 2.0, "odds {odds}");
}

#[test]
fn digits_reasonable() {
    let odds = calculate_odds("Ac,Ad", &["2c,2d".into()], "", 2, 50_000);
    // 2-dp rounding parity
    assert_eq!(odds, (odds * 100.0).round() / 100.0);
}

#[test]
fn exhaustive_turn_pair() {
    // 4-card board: exhaustive over 44 single river cards — deterministic
    let odds = calculate_odds("Qc,4c", &["3d,2h".into()], "9d,5s,7s,2s", 2, 50_000);
    let odds2 = calculate_odds("Qc,4c", &["3d,2h".into()], "9d,5s,7s,2s", 2, 50_000);
    assert_eq!(odds, odds2, "exhaustive path is deterministic");
}
