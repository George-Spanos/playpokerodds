pub mod auth;
pub mod extract;
pub mod health;
pub mod poker;
pub mod user;

use crate::state::AppState;
use axum::routing::{get, post, put};
use axum::Router;

pub fn router(state: AppState) -> Router {
    let auth_routes = Router::new()
        .route("/login", post(auth::login))
        .route("/register", post(auth::register))
        .route("/admin-login", post(auth::admin_login))
        .route("/refreshToken", get(auth::refresh_token));

    let poker_routes = Router::new()
        .route("/postNewRoundAnswer", post(poker::post_new_round_answer))
        .route(
            "/postExistingRoundAnswer",
            post(poker::post_existing_round_answer),
        )
        .route("/addToFavorites/:roundId", put(poker::add_to_favorites))
        .route(
            "/removeFromFavorites/:roundId",
            put(poker::remove_from_favorites),
        )
        .route("/fetchRoundById/:id", get(poker::fetch_round_by_id))
        .route("/fetchRound", get(poker::fetch_round))
        .route("/fetchLeaderboards", get(poker::fetch_leaderboards))
        .route("/fetchRandomRound", get(poker::fetch_random_round))
        .route("/fetchEvents", get(poker::fetch_events));

    let user_routes = Router::new()
        .route("/update", put(user::update))
        .route("/fetchByUsername/:username", get(user::fetch_by_username));

    let health_routes = Router::new()
        .route("/readiness", get(health::readiness))
        .route("/liveness", get(health::liveness))
        .route("/logError", post(health::log_error));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/poker", poker_routes)
        .nest("/user", user_routes)
        .nest("/health", health_routes)
        .with_state(state)
}
