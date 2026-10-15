//! User routes: PUT /user/update, GET /user/fetchByUsername/:username.
//! Port of routes/user.

use crate::auth::{hash_password, is_valid_email};
use crate::routes::extract::extract_user_data_from_request;
use crate::state::AppState;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct UpdateUserDto {
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
}

/// PUT /user/update — partial update; password re-hashes argon2id; 204 on success.
pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<UpdateUserDto>>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    let user = extract_user_data_from_request(&headers).ok_or((StatusCode::UNAUTHORIZED, ""))?;
    let Some(Json(dto)) = body else {
        return Err((StatusCode::BAD_REQUEST, "Invalid Payload."));
    };
    if dto.username.is_none() && dto.email.is_none() && dto.password.is_none() {
        // Joi .or('username','email','password') — at least one required
        return Err((StatusCode::BAD_REQUEST, "Invalid Payload."));
    }
    if let Some(email) = &dto.email {
        if !is_valid_email(email) {
            return Err((StatusCode::BAD_REQUEST, "Invalid email."));
        }
    }

    if let Some(username) = &dto.username {
        sqlx::query("UPDATE \"Users\" SET \"username\" = $1 WHERE \"id\" = $2")
            .bind(username)
            .bind(&user.user_id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::BAD_REQUEST, "Update failed."))?;
    }
    if let Some(email) = &dto.email {
        sqlx::query("UPDATE \"Users\" SET \"email\" = $1 WHERE \"id\" = $2")
            .bind(email)
            .bind(&user.user_id)
            .execute(&state.db)
            .await
            .map_err(|_| (StatusCode::BAD_REQUEST, "Update failed."))?;
    }
    if let Some(password) = &dto.password {
        if !password.is_empty() {
            let hash = hash_password(password);
            sqlx::query("UPDATE \"Users\" SET \"hash\" = $1 WHERE \"id\" = $2")
                .bind(hash)
                .bind(&user.user_id)
                .execute(&state.db)
                .await
                .map_err(|_| (StatusCode::BAD_REQUEST, "Update failed."))?;
        }
    }
    Ok(StatusCode::NO_CONTENT)
}

/// GET /user/fetchByUsername/:username — rank, score, distinct-round history
/// (newest first), favorites; odds/estimate masked to −1 for non-owners.
pub async fn fetch_by_username(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(username): Path<String>,
) -> Result<Response, Response> {
    let requester = extract_user_data_from_request(&headers);

    let user_row = sqlx::query("SELECT \"id\", \"username\", \"score\" FROM \"Users\" WHERE \"username\" = $1")
        .bind(&username)
        .fetch_optional(&state.db)
        .await
        .map_err(internal_error)?
        .ok_or((StatusCode::NOT_FOUND, "user not found").into_response())?;

    let user_id: String = user_row.get("id");
    let score: Decimal = user_row.get("score");
    let score_f = score.to_f64().unwrap_or(0.0);
    let score_2dp = dp2(score_f);

    // rank: position in ascending-score ordering of all users
    let rank_rows = sqlx::query("SELECT \"username\" FROM \"Users\" ORDER BY \"score\" ASC")
        .fetch_all(&state.db)
        .await
        .map_err(internal_error)?;
    let mut rank: i64 = -1;
    for (idx, row) in rank_rows.iter().enumerate() {
        let u: String = row.get("username");
        if u == username {
            rank = idx as i64 + 1;
            break;
        }
    }

    let is_owner = requester
        .as_ref()
        .map(|r| r.user_id == user_id)
        .unwrap_or(false);

    let history_rows = sqlx::query(
        "SELECT DISTINCT ON (\"roundId\") \
            \"RoundAnswers\".\"roundId\", \"RoundAnswers\".\"timestamp\", \
            R.\"myHand\", R.\"opponentsHands\", R.\"board\", \"estimate\", \"odds\", \
            ABS(\"estimate\" - \"odds\") as \"score\" \
         FROM \"RoundAnswers\" \
         LEFT JOIN \"Rounds\" R ON \"RoundAnswers\".\"roundId\" = R.\"id\" \
         WHERE \"RoundAnswers\".\"userId\" = $1 \
         ORDER BY \"roundId\", \"timestamp\"",
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    // reorder newest-first by timestamp (the outer ORDER BY in the TS query)
    let mut history: Vec<(chrono::NaiveDateTime, Value)> = history_rows
        .iter()
        .map(|row| {
            let timestamp: chrono::NaiveDateTime = row.get("timestamp");
            let estimate: Decimal = row.get("estimate");
            let odds: Decimal = row.get("odds");
            let history_score: Decimal = row.get("score");
            let round = json!({
                "myHand": row.get::<Value, _>("myHand"),
                "opponentsHands": row.get::<Value, _>("opponentsHands"),
                "board": row.get::<Value, _>("board"),
            });
            let (est, ods, sc) = if is_owner {
                (
                    dp2(estimate.to_f64().unwrap_or(0.0)),
                    dp2(odds.to_f64().unwrap_or(0.0)),
                    dp2(history_score.to_f64().unwrap_or(0.0)),
                )
            } else {
                // masked for non-owners: −1 like the TS API
                (-1.0, -1.0, dp2(history_score.to_f64().unwrap_or(0.0)))
            };
            let entry = json!({
                "roundId": row.get::<String, _>("roundId"),
                "timestamp": timestamp,
                "myHand": round["myHand"],
                "opponentsHands": round["opponentsHands"],
                "board": round["board"],
                "estimate": est,
                "odds": ods,
                "score": sc,
            });
            (timestamp, entry)
        })
        .collect();
    history.sort_by_key(|(ts, _)| std::cmp::Reverse(*ts));

    let favorite_rows = sqlx::query(
        "SELECT DISTINCT R.\"id\" FROM \"Rounds\" R \
         JOIN \"UserFavoriteRounds\" UFR ON R.\"id\" = UFR.\"roundId\" \
         WHERE UFR.\"userId\" = $1",
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;
    let favorite_ids: Vec<String> = favorite_rows.iter().map(|r| r.get("id")).collect();

    let body = json!({
        "rank": rank,
        "score": score_2dp,
        "rounds": history.into_iter().map(|(_, e)| e).collect::<Vec<_>>(),
        "username": username,
        "roundFavoritesIds": favorite_ids,
    });
    Ok(Json(body).into_response())
}

fn dp2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn internal_error<E>(_: E) -> Response {
    StatusCode::INTERNAL_SERVER_ERROR.into_response()
}
