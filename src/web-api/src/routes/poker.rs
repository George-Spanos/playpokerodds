//! Poker routes. Port of routes/poker — status codes, payloads, and messages
//! match the TS implementation.

use crate::domain::poker::{
    calculate_guess_score, create_random_round, create_round, validate_round, BoardState, Round,
};
use crate::domain::{self, leaderboard_min_games, DecodedJwt};
use crate::routes::extract::extract_user_data_from_request;
use crate::state::AppState;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;

use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;


fn uuid_text() -> String {
    uuid::Uuid::new_v4().to_string()
}

async fn log_event(state: &AppState, event_type: &str, payload: Value) {
    let _ = sqlx::query(
        "INSERT INTO \"Events\" (\"id\", \"type\", \"payload\") VALUES ($1, $2, $3)",
    )
    .bind(uuid_text())
    .bind(event_type)
    .bind(payload)
    .execute(&state.db)
    .await;
}

/// GET /poker/fetchRound — validate query params exactly like validatePayload.ts:
/// boardState 0..=3, totalHands 1..=9 (0 < totalHands ≤ 9), totalKnownHands ≤ totalHands.
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct FetchRoundQuery {
    #[serde(default)]
    boardState: Option<String>,
    #[serde(default)]
    totalHands: Option<String>,
    #[serde(default)]
    totalKnownHands: Option<String>,
}

/// TS Number() coercion: numeric strings parse, everything else → None.
fn number_param(v: &Option<String>) -> Option<i64> {
    v.as_ref().and_then(|s| s.trim().parse::<i64>().ok())
}

pub async fn fetch_round(
    State(_state): State<AppState>,
    Query(q): Query<FetchRoundQuery>,
) -> Result<Response, StatusCode> {
    let board_state = number_param(&q.boardState).ok_or(StatusCode::BAD_REQUEST)?;
    let total_hands = number_param(&q.totalHands).ok_or(StatusCode::BAD_REQUEST)?;
    let total_known = number_param(&q.totalKnownHands).ok_or(StatusCode::BAD_REQUEST)?;

    if !(0..=3).contains(&board_state)
        || total_hands <= 0
        || total_hands > 9
        || total_known > total_hands
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut rng = rand::thread_rng();
    let round = create_round(
        total_hands as usize,
        total_known as usize,
        BoardState::from_i32(board_state as i32).ok_or(StatusCode::BAD_REQUEST)?,
        &mut rng,
    );
    drop(rng);
    Ok(Json(round).into_response())
}

/// GET /poker/fetchRandomRound
pub async fn fetch_random_round() -> Response {
    let mut rng = rand::thread_rng();
    Json(create_random_round(&mut rng)).into_response()
}

/// GET /poker/fetchRoundById/:id — 400 when id missing (axum routing guarantees
/// presence, empty-string id still 400s), 404 when the round doesn't exist.
pub async fn fetch_round_by_id(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Response, StatusCode> {
    if id.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let row = sqlx::query(
        "SELECT \"myHand\", \"opponentsHands\", \"board\" FROM \"Rounds\" WHERE \"id\" = $1",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let round = Round {
        my_hand: serde_json::from_value(row.get("myHand")).unwrap_or_default(),
        opponents_hands: serde_json::from_value(row.get("opponentsHands")).unwrap_or_default(),
        board: serde_json::from_value(row.get("board")).unwrap_or_default(),
    };
    Ok(Json(round).into_response())
}

#[derive(Debug, Deserialize)]
pub struct NewAnswerDto {
    #[serde(default)]
    pub round: Option<Round>,
    #[serde(default)]
    pub estimate: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ExistingAnswerDto {
    #[serde(default)]
    #[allow(non_snake_case)]
    pub roundId: Option<String>,
    #[serde(default)]
    pub estimate: Option<f64>,
}

pub struct AnswerContext {
    pub dto_round: Option<Round>,
    pub round_id: String,
    pub odds: f64,
    pub estimate: f64,
    pub score: f64,
    pub user: Option<DecodedJwt>,
}

/// POST /poker/postNewRoundAnswer
pub async fn post_new_round_answer(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<NewAnswerDto>>,
) -> Result<Response, Response> {
    let Json(dto) = body.ok_or_else(bad_request_body)?;
    let round = dto.round.clone().ok_or_else(bad_request_body)?;
    let estimate = dto.estimate.ok_or_else(bad_request_body)?;
    if !validate_round(&round) {
        return Err(bad_request_body());
    }

    // calculateWinOdds — in-process engine (formerly the calc-odds-api service)
    let iterations = odd_iterations();
    let my_hand = round.my_hand.join(",");
    let board = round.board.join(",");
    let known_opponents: Vec<String> = round
        .opponents_hands
        .iter()
        .map(|h| h.iter().map(|c| c.to_string()).collect::<Vec<_>>().join(","))
        .collect();
    let odds = crate::odds::calculate_odds(
        &my_hand,
        &known_opponents,
        &board,
        known_opponents.len() + 1,
        iterations,
    );

    let score = calculate_guess_score(estimate, odds);

    // persistNewRound
    let round_id = uuid_text();
    let odds_dec = f64_to_decimal(odds);
    let estimate_dec = f64_to_decimal(estimate);
    sqlx::query(
        "INSERT INTO \"Rounds\" (\"id\", \"myHand\", \"opponentsHands\", \"board\", \"odds\") VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(&round_id)
    .bind(serde_json::to_value(&round.my_hand).map_err(internal_error)?)
    .bind(serde_json::to_value(&round.opponents_hands).map_err(internal_error)?)
    .bind(serde_json::to_value(&round.board).map_err(internal_error)?)
    .bind(odds_dec)
    .execute(&state.db)
    .await
    .map_err(internal_error)?;

    let user = extract_user_data_from_request(&headers);
    sqlx::query(
        "INSERT INTO \"RoundAnswers\" (\"id\", \"estimate\", \"userId\", \"roundId\") VALUES ($1, $2, $3, $4)",
    )
    .bind(uuid_text())
    .bind(estimate_dec)
    .bind(user.as_ref().map(|u| u.user_id.clone()))
    .bind(&round_id)
    .execute(&state.db)
    .await
    .map_err(internal_error)?;

    let mut event_payload = json!({
        "round": { "round": round, "estimate": estimate },
        "odds": odds,
    });
    if let Some(u) = &user {
        event_payload["userId"] = json!(u.user_id);
    }
    log_event(&state, domain::EVENT_USER_POSTED_ANSWER, event_payload).await;

    // persistUserScore
    if let Some(u) = &user {
        update_running_score(&state, &u.user_id, score).await;
    }

    let body = json!({
        "roundId": round_id,
        "estimate": round2dp(estimate),
        "odds": round2dp(odds),
        "score": round2dp(score),
        "round": round,
    });
    Ok(Json(body).into_response())
}

/// POST /poker/postExistingRoundAnswer
pub async fn post_existing_round_answer(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<ExistingAnswerDto>>,
) -> Result<Response, Response> {
    let Json(dto) = body.ok_or_else(bad_request_body)?;
    let round_id = dto.roundId.ok_or_else(bad_request_body)?;
    let estimate = dto.estimate.ok_or_else(bad_request_body)?;
    if round_id.is_empty() {
        return Err(bad_request_body());
    }

    let row = sqlx::query(
        "SELECT \"myHand\", \"opponentsHands\", \"board\", \"odds\" FROM \"Rounds\" WHERE \"id\" = $1",
    )
    .bind(&round_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?
    .ok_or(StatusCode::NOT_FOUND.into_response())?;

    let round = Round {
        my_hand: serde_json::from_value(row.get("myHand")).unwrap_or_default(),
        opponents_hands: serde_json::from_value(row.get("opponentsHands")).unwrap_or_default(),
        board: serde_json::from_value(row.get("board")).unwrap_or_default(),
    };
    let odds: Decimal = row.get("odds");
    let odds = decimal_to_f64(odds);
    let score = calculate_guess_score(estimate, odds);

    let user = extract_user_data_from_request(&headers);
    sqlx::query(
        "INSERT INTO \"RoundAnswers\" (\"id\", \"estimate\", \"userId\", \"roundId\") VALUES ($1, $2, $3, $4)",
    )
    .bind(uuid_text())
    .bind(f64_to_decimal(estimate))
    .bind(user.as_ref().map(|u| u.user_id.clone()))
    .bind(&round_id)
    .execute(&state.db)
    .await
    .map_err(internal_error)?;

    let mut event_payload = json!({
        "round": { "roundId": round_id, "estimate": estimate },
        "odds": odds,
    });
    if let Some(u) = &user {
        event_payload["userId"] = json!(u.user_id);
    }
    log_event(&state, domain::EVENT_USER_POSTED_EXISTING_ANSWER, event_payload).await;

    if let Some(u) = &user {
        update_running_score(&state, &u.user_id, score).await;
    }

    let body = json!({
        "roundId": round_id,
        "estimate": round2dp(estimate),
        "odds": round2dp(odds),
        "score": round2dp(score),
        "round": round,
    });
    Ok(Json(body).into_response())
}

/// PUT /poker/addToFavorites/:roundId — 401 unauth, 304 when already favorite, 204 on success.
pub async fn add_to_favorites(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(round_id): axum::extract::Path<String>,
) -> Result<StatusCode, StatusCode> {
    let user = extract_user_data_from_request(&headers).ok_or(StatusCode::UNAUTHORIZED)?;
    if round_id.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let exists = sqlx::query(
        "SELECT 1 FROM \"UserFavoriteRounds\" WHERE \"roundId\" = $1 AND \"userId\" = $2",
    )
    .bind(&round_id)
    .bind(&user.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if exists.is_some() {
        return Ok(StatusCode::NOT_MODIFIED);
    }
    sqlx::query("INSERT INTO \"UserFavoriteRounds\" (\"roundId\", \"userId\") VALUES ($1, $2)")
        .bind(&round_id)
        .bind(&user.user_id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}

/// PUT /poker/removeFromFavorites/:roundId — 401 unauth, 404 when not a favorite
/// (Prisma delete on missing row throws P2025 → express 500; axum maps missing to 404;
/// TS behavior for the happy path 204 is preserved).
pub async fn remove_from_favorites(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(round_id): axum::extract::Path<String>,
) -> Result<StatusCode, StatusCode> {
    let user = extract_user_data_from_request(&headers).ok_or(StatusCode::UNAUTHORIZED)?;
    if round_id.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let result = sqlx::query(
        "DELETE FROM \"UserFavoriteRounds\" WHERE \"roundId\" = $1 AND \"userId\" = $2",
    )
    .bind(&round_id)
    .bind(&user.user_id)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(StatusCode::NO_CONTENT)
}

/// GET /poker/fetchLeaderboards — ascending score, min-games filter.
pub async fn fetch_leaderboards(State(state): State<AppState>) -> Result<Response, StatusCode> {
    let min_games = leaderboard_min_games();
    let rows = sqlx::query(
        "SELECT u.\"username\", u.\"score\", COUNT(ra.\"id\") as \"gamesPlayed\" \
         FROM \"Users\" u LEFT JOIN \"RoundAnswers\" ra ON ra.\"userId\" = u.\"id\" \
         GROUP BY u.\"id\", u.\"username\", u.\"score\" \
         ORDER BY u.\"score\" ASC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let users: Vec<Value> = rows
        .iter()
        .filter_map(|row| {
            let username: String = row.get("username");
            let score: Decimal = row.get("score");
            let games: i64 = row.get("gamesPlayed");
            if (games as usize) < min_games {
                return None;
            }
            Some(json!({
                "username": username,
                "score": decimal_to_f64(score),
                "gamesPlayed": games,
            }))
        })
        .collect();
    Ok(Json(users).into_response())
}

/// GET /poker/fetchEvents — paginated, term filter on payload text.
pub async fn fetch_events(
    State(state): State<AppState>,
    Query(q): Query<FetchEventsQuery>,
) -> Result<Response, StatusCode> {
    let page_size = q.page_size.unwrap_or(0).max(1);
    let page = q.page.unwrap_or(0).max(1);
    let term = q.term.clone().unwrap_or_default();
    let offset = (page - 1) * page_size;

    let pattern = format!("%{}%", term);
    let rows = if term.is_empty() {
        sqlx::query(
            "SELECT \"id\", \"type\", \"payload\", \"timestamp\", COUNT(*) OVER() as \"total\" \
             FROM \"Events\" ORDER BY \"timestamp\" DESC LIMIT $1 OFFSET $2",
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query(
            "SELECT \"id\", \"type\", \"payload\", \"timestamp\", COUNT(*) OVER() as \"total\" \
             FROM \"Events\" WHERE \"payload\"::text LIKE $3 ORDER BY \"timestamp\" DESC LIMIT $1 OFFSET $2",
        )
        .bind(page_size)
        .bind(offset)
        .bind(pattern)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    let total: i64 = rows.first().map(|r| r.get("total")).unwrap_or(0);
    let events: Vec<Value> = rows
        .iter()
        .map(|row| {
            let id: String = row.get("id");
            let event_type: String = row.get("type");
            let payload: Value = row.get("payload");
            let timestamp: chrono::DateTime<chrono::Utc> = row.get("timestamp");
            json!({
                "id": id,
                "type": event_type,
                "payload": payload,
                "timestamp": timestamp,
            })
        })
        .collect();
    Ok(Json(json!({ "events": events, "total": total })).into_response())
}

#[derive(Debug, Deserialize)]
pub struct FetchEventsQuery {
    #[serde(default, rename = "pageSize")]
    page_size: Option<i64>,
    #[serde(default)]
    page: Option<i64>,
    #[serde(default)]
    term: Option<String>,
}

/// Running score: (currentScore × (roundsPlayed − 1) + score) / roundsPlayed,
/// over distinct rounds played. Matches persistUserScore + countUniqueRoundsPlayed.
async fn update_running_score(state: &AppState, user_id: &str, score: f64) {
    let rounds_played: Option<i64> = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT \"roundId\") FROM \"RoundAnswers\" WHERE \"userId\" = $1",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .ok();
    let Some(n) = rounds_played else { return };
    if n <= 0 {
        return;
    }
    let n = n as f64;
    let current: Option<Decimal> = sqlx::query_scalar("SELECT \"score\" FROM \"Users\" WHERE \"id\" = $1")
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .ok();
    let Some(current) = current else { return };
    let current_f = decimal_to_f64(current);
    let new_score = (current_f * (n - 1.0) + score) / n;
    let _ = sqlx::query("UPDATE \"Users\" SET \"score\" = $1 WHERE \"id\" = $2")
        .bind(f64_to_decimal(round2dp(new_score)))
        .bind(user_id)
        .execute(&state.db)
        .await;
}

/// ITERATIONS env with the same semantics the calc service had: invalid or
/// missing → 50,000 with a console warning.
fn odd_iterations() -> usize {
    match std::env::var("ITERATIONS").map(|v| v.parse::<usize>()) {
        Ok(Ok(n)) if n > 0 => n,
        _ => {
            eprintln!("iterations invalid value. Will use default value: 50_000");
            50_000
        }
    }
}

fn round2dp(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn f64_to_decimal(v: f64) -> Decimal {
    Decimal::from_f64_retain(round2dp(v)).unwrap_or(Decimal::ZERO)
}

fn decimal_to_f64(d: Decimal) -> f64 {
    d.to_f64().unwrap_or(0.0)
}

fn bad_request_body() -> Response {
    StatusCode::BAD_REQUEST.into_response()
}

fn internal_error<E>(_: E) -> Response {
    StatusCode::INTERNAL_SERVER_ERROR.into_response()
}
