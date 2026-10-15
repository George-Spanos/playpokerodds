//! Domain logic shared across routes.

pub mod poker;

use serde::{Deserialize, Serialize};

pub const EVENT_USER_REGISTERED: &str = "USER_REGISTERED";
pub const EVENT_USER_LOGGED_IN: &str = "USER_LOGGED_IN";
pub const EVENT_USER_POSTED_ANSWER: &str = "USER_POSTED_ANSWER";
pub const EVENT_USER_POSTED_EXISTING_ANSWER: &str = "USER_POSTED_EXISTING_ANSWER";
pub const EVENT_UI_ERROR: &str = "UI_ERROR";
pub const EVENT_UNKNOWN_ERROR: &str = "UNKNOWN_ERROR";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedJwt {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub email: String,
    pub role: i32,
}

pub fn decoded_jwt_is_valid(value: &Option<DecodedJwt>) -> bool {
    value.is_some()
}

/// LEADERBOARD_MIN_GAMES with the same TS quirk: `Number(undefined) ?? 0` yields
/// NaN (not null), so a missing env var degrades every filter comparison to false
/// and the leaderboard is empty. An empty-string var parses as 0 via fallback.
pub fn leaderboard_min_games() -> usize {
    match std::env::var("LEADERBOARD_MIN_GAMES") {
        Ok(v) if !v.is_empty() => v.parse().unwrap_or(0),
        _ => 0,
    }
}
