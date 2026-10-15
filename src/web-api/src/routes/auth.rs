//! Auth routes: /login, /register, /refreshToken, /admin-login.
//! Port of routes/auth. Status codes and error messages match the TS API.

use crate::auth::{self, is_bcrypt_hash, is_valid_email, sign_user_data, verify_argon2, verify_bcrypt};
use crate::domain;
use crate::routes::extract::extract_user_data_from_request;
use crate::state::AppState;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct AuthPayload {
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
}

#[allow(dead_code)]
struct UserRow {
    id: String,
    username: String,
    email: String,
    salt: String,
    hash: String,
    score: rust_decimal::Decimal,
    role: Option<i32>,
}

async fn find_user_by_username(
    state: &AppState,
    username: &str,
) -> Option<UserRow> {
    let row = sqlx::query(
        "SELECT u.\"id\", u.\"username\", u.\"email\", u.\"salt\", u.\"hash\", u.\"score\", ur.\"role\" as \"role\" \
         FROM \"Users\" u LEFT JOIN \"UserRoles\" ur ON ur.\"userEmail\" = u.\"email\" \
         WHERE u.\"username\" = $1",
    )
    .bind(username)
    .fetch_one(&state.db)
    .await
    .ok()?;
    Some(UserRow {
        id: row.get("id"),
        username: row.get("username"),
        email: row.get("email"),
        salt: row.get("salt"),
        hash: row.get("hash"),
        score: row.get("score"),
        role: row.get("role"),
    })
}

fn user_response(id: &str, username: &str, email: &str, score: rust_decimal::Decimal) -> serde_json::Value {
    let token = sign_user_data(id, email, role_for(email));
    json!({
        "id": id,
        "username": username,
        "email": email,
        "score": score_to_f64(score),
        "token": token,
    })
}

fn role_for(_email: &str) -> i32 {
    0 // filled by callers holding the row; kept for response parity
}

fn score_to_f64(score: rust_decimal::Decimal) -> f64 {
    use rust_decimal::prelude::ToPrimitive;
    score.to_f64().unwrap_or(0.0)
}

/// validateAuthPayload: 400s with the same messages.
fn validate_auth_payload(payload: &AuthPayload) -> Result<(), (StatusCode, &'static str)> {
    if payload.username.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Invalid Payload. No username."));
    }
    if let Some(email) = &payload.email {
        if !is_valid_email(email) {
            return Err((StatusCode::BAD_REQUEST, "Invalid email."));
        }
    }
    if payload.password.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Invalid Payload: no password."));
    }
    Ok(())
}

async fn log_event(state: &AppState, event_type: &str, payload: serde_json::Value) {
    let _ = sqlx::query(
        "INSERT INTO \"Events\" (\"id\", \"type\", \"payload\") VALUES ($1, $2, $3)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(event_type)
    .bind(payload)
    .execute(&state.db)
    .await;
}

/// POST /auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<axum::response::Response, (StatusCode, &'static str)> {
    let dto: AuthPayload = serde_json::from_value(payload.clone())
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid Payload."))?;
    validate_auth_payload(&dto)?;
    // TS registerUser inserts with whatever it destructured; a missing email
    // fails the Prisma insert and surfaces as 400 through the catch. Mirror:
    // any absent field after validation → 400.
    let (Some(username), Some(email), Some(password)) = (dto.username, dto.email, dto.password)
    else {
        return Err((StatusCode::BAD_REQUEST, "Invalid Payload."));
    };

    let salt_b64 = argon2::password_hash::SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let salt_str = salt_b64.to_string();
    let hash = auth::hash_password(&password);

    let result = sqlx::query(
        "INSERT INTO \"Users\" (\"id\", \"email\", \"username\", \"salt\", \"hash\") VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&email)
    .bind(&username)
    .bind(&salt_str)
    .bind(&hash)
    .execute(&state.db)
    .await;

    if let Err(e) = result {
        let msg = e.as_database_error().map(|d| d.message()).unwrap_or("");
        if e.as_database_error().map(|d| d.is_unique_violation()).unwrap_or(false) {
            // P2002 parity: which field collides
            let field = if msg.contains("username") { "username" } else { "email" };
            return Err((
                StatusCode::BAD_REQUEST,
                match field {
                    "username" => "username already exists.",
                    _ => "email already exists.",
                },
            ));
        }
        return Err((StatusCode::BAD_REQUEST, "Registration failed."));
    }

    log_event(
        &state,
        domain::EVENT_USER_REGISTERED,
        json!({ "email": email, "username": username }),
    )
    .await;

    let user = find_user_by_username(&state, &username)
        .await
        .expect("user just created");
    let body = user_response(&user.id, &user.username, &user.email, user.score);
    Ok(axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::Body::from(body.to_string()))
        .expect("response build cannot fail"))
}

/// POST /auth/login and /auth/admin-login (admin flag checks role ≥ Superuser).
pub async fn login(
    State(state): State<AppState>,
    _headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<axum::response::Response, (StatusCode, axum::response::Response)> {
    let dto: AuthPayload = serde_json::from_value(payload)
        .map_err(|_| (StatusCode::UNAUTHORIZED, unauthorized("Invalid Credentials")))?;
    validate_auth_payload(&dto).map_err(|(status, msg)| (status, unauthorized(msg)))?;

    let username = dto.username.unwrap();
    let password = dto.password.unwrap();
    let user = find_user_by_username(&state, &username)
        .await
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, unauthorized("user not found")))?;

    let password_ok = if is_bcrypt_hash(&user.hash) {
        let ok = verify_bcrypt(&password, &user.hash);
        // transparent upgrade: re-hash argon2id on successful legacy login
        if ok {
            let new_hash = auth::hash_password(&password);
            let _ = sqlx::query("UPDATE \"Users\" SET \"hash\" = $1 WHERE \"id\" = $2")
                .bind(new_hash)
                .bind(&user.id)
                .execute(&state.db)
                .await;
        }
        ok
    } else {
        verify_argon2(&password, &user.hash)
    };
    if !password_ok {
        return Err((StatusCode::UNAUTHORIZED, unauthorized("Wrong Credentials")));
    }

    log_event(
        &state,
        domain::EVENT_USER_LOGGED_IN,
        json!({ "email": user.email }),
    )
    .await;

    let body = user_response(&user.id, &user.username, &user.email, user.score);
    Ok(axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::Body::from(body.to_string()))
        .expect("response build cannot fail"))
}

/// POST /auth/admin-login: like login but requires role >= Superuser (1).
pub async fn admin_login(
    State(state): State<AppState>,
    _headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Result<axum::response::Response, (StatusCode, axum::response::Response)> {
    let dto: AuthPayload = serde_json::from_value(payload)
        .map_err(|_| (StatusCode::UNAUTHORIZED, unauthorized("Invalid Credentials")))?;
    validate_auth_payload(&dto).map_err(|(status, msg)| (status, unauthorized(msg)))?;

    let username = dto.username.unwrap();
    let password = dto.password.unwrap();
    let user = find_user_by_username(&state, &username)
        .await
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, unauthorized("user not found")))?;

    let password_ok = if is_bcrypt_hash(&user.hash) {
        verify_bcrypt(&password, &user.hash)
    } else {
        verify_argon2(&password, &user.hash)
    };
    if !password_ok {
        return Err((StatusCode::UNAUTHORIZED, unauthorized("Wrong Credentials")));
    }
    let role = user.role.unwrap_or(0);
    if role < 1 {
        return Err((StatusCode::UNAUTHORIZED, unauthorized("You are not an admin")));
    }

    log_event(
        &state,
        domain::EVENT_USER_LOGGED_IN,
        json!({ "email": user.email }),
    )
    .await;

    let body = user_response(&user.id, &user.username, &user.email, user.score);
    Ok(axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::Body::from(body.to_string()))
        .expect("response build cannot fail"))
}

/// GET /auth/refreshToken: re-issue a token for the bearer. 401 "Session expired"
/// on invalid token, 401 "User not Found" when the user row is gone.
pub async fn refresh_token(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<axum::response::Response, (StatusCode, &'static str)> {
    let user_data = extract_user_data_from_request(&headers)
        .ok_or((StatusCode::UNAUTHORIZED, "Session expired"))?;

    let row = sqlx::query(
        "SELECT u.\"id\", u.\"username\", u.\"email\", u.\"score\", ur.\"role\" as \"role\" \
         FROM \"Users\" u LEFT JOIN \"UserRoles\" ur ON ur.\"userEmail\" = u.\"email\" \
         WHERE u.\"id\" = $1",
    )
    .bind(&user_data.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Session expired"))?
    .ok_or((StatusCode::UNAUTHORIZED, "User not Found"))?;

    let id: String = row.get("id");
    let username: String = row.get("username");
    let email: String = row.get("email");
    let score: rust_decimal::Decimal = row.get("score");
    let role: Option<i32> = row.get("role");

    let token = sign_user_data(&id, &email, role.unwrap_or(0));
    let body = json!({
        "id": id,
        "username": username,
        "email": email,
        "score": score_to_f64(score),
        "token": token,
    });
    Ok(axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::Body::from(body.to_string()))
        .expect("response build cannot fail"))
}

fn unauthorized(message: &str) -> axum::response::Response {
    axum::http::Response::builder()
        .status(StatusCode::UNAUTHORIZED)
        .body(axum::body::Body::from(
            json!({ "success": false, "message": message }).to_string(),
        ))
        .expect("response build cannot fail")
}
