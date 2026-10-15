use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use ppo_calc_odds_api::calculate_odds;
use serde::Deserialize;
use serde_json::json;

#[derive(Clone)]
struct AppState {
    iterations: usize,
    api_key: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OddsRequest {
    #[serde(default)]
    round: Option<RoundBody>,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
struct RoundBody {
    #[serde(default)]
    myHand: Option<Vec<String>>,
    #[serde(default)]
    opponentsHands: Option<Vec<Vec<String>>>,
    #[serde(default)]
    board: Option<Vec<String>>,
}

fn validate_round(body: &RoundBody) -> bool {
    use ppo_calc_odds_api::cards::{is_valid_card, UNKNOWN_CARD};

    let Some(my_hand) = &body.myHand else { return false };
    let Some(opponents) = &body.opponentsHands else { return false };
    let Some(board) = &body.board else { return false };

    // validateHand: 2 valid cards, distinct unless both unknown
    let valid_hand = |h: &Vec<String>| -> bool {
        h.len() == 2
            && h.iter().all(|c| is_valid_card(c))
            && (h[0] != h[1] || (h[0] == UNKNOWN_CARD && h[1] == UNKNOWN_CARD))
    };
    if !valid_hand(my_hand) {
        return false;
    }
    if opponents.is_empty() || opponents.len() > 8 || !opponents.iter().all(valid_hand) {
        return false;
    }
    // board: 0/3/4/5 valid cards
    if !(board.is_empty() || board.len() == 3 || board.len() == 4 || board.len() == 5)
        || !board.iter().all(|c| is_valid_card(c))
    {
        return false;
    }
    // no duplicate real cards across the round
    let mut cards: Vec<&String> = my_hand
        .iter()
        .chain(opponents.iter().flatten())
        .filter(|c| c.as_str() != UNKNOWN_CARD)
        .collect();
    cards.sort_unstable();
    cards.dedup();
    let original = my_hand
        .iter()
        .chain(opponents.iter().flatten())
        .filter(|c| c.as_str() != UNKNOWN_CARD)
        .count();
    cards.len() == original
}

async fn calc_odds(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<Json<OddsRequest>, axum::extract::rejection::JsonRejection>,
) -> Response {
    // auth gate: open when APIKEY unset, 403 on mismatch
    if let Some(key) = &state.api_key {
        if headers.get("x-api-key").and_then(|v| v.to_str().ok()) != Some(key.as_str()) {
            return StatusCode::FORBIDDEN.into_response();
        }
    }

    // unparseable body → 400
    let Ok(Json(req)) = body else {
        return (StatusCode::BAD_REQUEST, "failed to parse body").into_response();
    };
    let Some(round) = req.round else {
        return (StatusCode::BAD_REQUEST, "invalid round payload").into_response();
    };
    if !validate_round(&round) {
        return (StatusCode::BAD_REQUEST, "invalid round payload").into_response();
    }

    let board = round.board.unwrap_or_default();
    let board_str = board.join(",");
    let known_opponents: Vec<String> = round
        .opponentsHands
        .unwrap_or_default()
        .iter()
        .map(|h| h.join(","))
        .filter(|h| h != "..,..")
        .collect();
    let my_hand = round.myHand.unwrap().join(",");
    let num_players = known_opponents.len() + 1;

    let odds = calculate_odds(
        &my_hand,
        &known_opponents,
        &board_str,
        num_players,
        state.iterations,
    );
    Json(json!({ "odds": odds })).into_response()
}

async fn liveness() -> &'static str {
    "Liveness Check Passed"
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(7071);

    let iterations = match std::env::var("ITERATIONS").map(|v| v.parse::<usize>()) {
        Ok(Ok(n)) if n > 0 => n,
        _ => {
            eprintln!("iterations invalid value. Will use default value: 50_000");
            50_000
        }
    };

    let api_key = std::env::var("APIKEY").ok().filter(|k| !k.is_empty());

    let state = AppState { iterations, api_key };
    let app = Router::new()
        .route("/api/calcOdds", post(calc_odds))
        .route("/liveness", get(liveness))
        .layer(
            axum::middleware::from_fn(
                |req: axum::http::Request<axum::body::Body>,
                 next: axum::middleware::Next| async move {
                    // permissive CORS: this is a same-cluster service
                    let mut res = next.run(req).await;
                    res.headers_mut()
                        .insert("access-control-allow-origin", "*".parse().unwrap());
                    Ok::<_, std::convert::Infallible>(res)
                },
            ),
        )
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("port bind failed");
    println!("listening on {port}");
    axum::serve(listener, app).await.expect("server error");
}
