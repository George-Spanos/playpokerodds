//! Health routes: /readiness, /liveness, /logError. Port of routes/health.

use crate::domain;
use crate::state::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde_json::Value;

pub async fn readiness(State(state): State<AppState>) -> StatusCode {
    let count_ok = sqlx::query("SELECT 1 FROM \"Users\" LIMIT 1")
        .execute(&state.db)
        .await
        .is_ok();
    let calc_ok = std::env::var("CALC_ODDS_URL")
        .map(|u| !u.is_empty())
        .unwrap_or(false);
    if count_ok && calc_ok {
        StatusCode::OK
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

pub async fn liveness() -> &'static str {
    "liveness check passed"
}

pub async fn log_error(State(state): State<AppState>, Json(payload): Json<Value>) -> StatusCode {
    sqlx::query("INSERT INTO \"Events\" (\"id\", \"type\", \"payload\") VALUES ($1, $2, $3)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(domain::EVENT_UI_ERROR)
        .bind(payload)
        .execute(&state.db)
        .await
        .map(|_| StatusCode::CREATED)
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}
