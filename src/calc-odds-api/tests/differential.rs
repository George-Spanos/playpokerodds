//! Differential test: same requests to the Deno service (still running) and the
//! Rust engine — exact odds match on exhaustive cases, ±1pp on sampled.
use ppo_calc_odds_api::calculate_odds;

fn deno_odds(round_json: &str) -> Option<f64> {
    // synchronous curl via std (no reqwest dep in tests)
    use std::process::Command;
    let out = Command::new("curl")
        .args(["-s", "-X", "POST", "http://localhost:7071/api/calcOdds",
               "-H", "content-type: application/json", "--data-raw", round_json])
        .output()
        .ok()?;
    let text = String::from_utf8(out.stdout).ok()?;
    let v: serde_json::Value = serde_json::from_str(&text).ok()?;
    v["odds"].as_f64()
}

fn deno_alive() -> bool {
    use std::process::Command;
    Command::new("curl")
        .args(["-s", "-m", "3", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:7071/liveness"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("200"))
        .unwrap_or(false)
}

#[test]
fn exhaustive_cases_match_deno_exactly() {
    if !deno_alive() {
        eprintln!("deno service not running; skipping differential test");
        return;
    }
    // river-exact cases (no sampling in either engine)
    let cases = [
        (r#"{"round":{"myHand":["Qc","4c"],"opponentsHands":[["3d","2h"]],"board":["9d","5s","7s","2s"]},"estimate":1}"#, "Qc,4c", "3d,2h", "9d,5s,7s,2s"),
        (r#"{"round":{"myHand":["Qs","4c"],"opponentsHands":[["8c","Ks"]],"board":["Th","6d","Js","2c"]},"estimate":1}"#, "Qs,4c", "8c,Ks", "Th,6d,Js,2c"),
        (r#"{"round":{"myHand":["Qc","8h"],"opponentsHands":[["9d","Jh"]],"board":["5d","Qd","7h"]},"estimate":1}"#, "Qc,8h", "9d,Jh", "5d,Qd,7h"),
    ];
    for (json, my, opp, board) in cases {
        let deno = deno_odds(json).expect("deno responded");
        let rust = calculate_odds(my, &[opp.to_string()], board, 2, 50_000);
        assert!((deno - rust).abs() < 0.005, "deno {deno} vs rust {rust} for {json}");
    }
}

#[test]
fn sampled_cases_match_deno_within_tolerance() {
    if !deno_alive() {
        eprintln!("deno service not running; skipping differential test");
        return;
    }
    let cases = [
        (r#"{"round":{"myHand":["Ac","Ad"],"opponentsHands":[["2c","2d"]],"board":[]},"estimate":1}"#, "Ac,Ad", "2c,2d", ""),
        (r#"{"round":{"myHand":["Ac","Kd"],"opponentsHands":[["..",".."]],"board":[]},"estimate":1}"#, "Ac,Kd", "..,..", ""),
        (r#"{"round":{"myHand":["2d","3c"],"opponentsHands":[["..",".."]],"board":["5s","Ts","4d","Kh"]},"estimate":1}"#, "2d,3c", "..,..", "5s,Ts,4d,Kh"),
    ];
    for (json, my, opp, board) in cases {
        let deno = deno_odds(json).expect("deno responded");
        let rust = calculate_odds(my, &[opp.to_string()], board, 2, 50_000);
        assert!((deno - rust).abs() <= 1.0, "deno {deno} vs rust {rust} for {json}");
    }
}
