use ppo_api::db;
use ppo_api::routes;
use ppo_api::state::AppState;

fn test_state(pool: sqlx::PgPool) -> AppState {
    AppState {
        db: pool,
    }
}

async fn clean_db(pool: &sqlx::PgPool) {
    for table in [
        "UserFavoriteRounds",
        "RoundAnswers",
        "Rounds",
        "Events",
        "UserRoles",
        "Users",
    ] {
        sqlx::query(&format!("DELETE FROM \"{table}\""))
            .execute(pool)
            .await
            .expect("clean db");
    }
}

async fn body_string(resp: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(
        resp.into_body(),
        1024 * 1024,
    )
    .await
    .expect("body collect");
    serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null)
}

async fn app_with_clean_db() -> (axum::Router, sqlx::PgPool) {
    std::env::set_var("JWT_SECRET", "SOME_SECRET");
    let pool = db::init_pool(
        &std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://root:root@localhost:5432/gtop".into()),
    )
    .await
    .expect("db init");
    clean_db(&pool).await;
    (routes::router(test_state(pool.clone())), pool)
}

const USER1: &str = r#"{"email":"george@gmail.com","password":"123123","username":"gerogesp"}"#;
const USER2: &str = r#"{"email":"nick@gmail.com","password":"123123","username":"nick"}"#;

const NEW_ROUND_VALID_1: &str =
    r#"{"round":{"myHand":["5d","Jh"],"opponentsHands":[["..",".."]],"board":[]},"estimate":50}"#;
const NEW_ROUND_VALID_2: &str =
    r#"{"round":{"myHand":["5d","Ah"],"opponentsHands":[["..",".."]],"board":[]},"estimate":40}"#;

async fn send(
    app: &axum::Router,
    method: &str,
    uri: &str,
    token: Option<&str>,
    body: Option<String>,
) -> axum::response::Response {
    use tower::util::ServiceExt;
    let mut req = match method {
        "GET" => axum::http::Request::builder()
            .method("GET")
            .uri(uri)
            .body(axum::body::Body::empty())
            .unwrap(),
        _ => axum::http::Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(axum::body::Body::from(body.unwrap_or_default()))
            .unwrap(),
    };
    if let Some(t) = token {
        req.headers_mut()
            .insert("authorization", format!("Bearer {t}").parse().unwrap());
    }
    app.clone().oneshot(req).await.expect("request")
}

fn s(lit: &str) -> Option<String> {
    Some(lit.to_string())
}

#[tokio::test]
async fn health_endpoints() {
    let (app, _pool) = app_with_clean_db().await;
    let liveness = send(&app, "GET", "/health/liveness", None, None).await;
    assert_eq!(liveness.status(), 200);
    let readiness = send(&app, "GET", "/health/readiness", None, None).await;
    assert_eq!(readiness.status(), 200);
    let log_error = send(
        &app,
        "POST",
        "/health/logError",
        None,
        s(r#"{"body":"somerrorbody"}"#),
    )
    .await;
    assert_eq!(log_error.status(), 201);
}

#[tokio::test]
async fn auth_register_login_refresh() {
    let (app, pool) = app_with_clean_db().await;

    for payload in [
        r#"{"username":"george@gmail.com","password":"123123"}"#,
        r#"{"email":"george","password":"123123"}"#,
        r#"{"email":"takis@gmail.com"}"#,
    ] {
        let resp = send(&app, "POST", "/auth/register", None, s(payload)).await;
        assert_eq!(resp.status(), 400, "invalid payload {payload}");
    }

    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert!(body["token"].is_string());
    let token1 = body["token"].as_str().unwrap().to_string();

    let resp = send(&app, "POST", "/auth/register", None, s(USER2)).await;
    assert_eq!(resp.status(), 200);

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Users\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 2);

    let resp = send(
        &app,
        "POST",
        "/auth/login",
        None,
        s(r#"{"email":"maria@gmail.com","password":"123123","username":"maria"}"#),
    )
    .await;
    assert_eq!(resp.status(), 401);
    let resp = send(
        &app,
        "POST",
        "/auth/login",
        None,
        s(r#"{"email":"george@gmail.com","password":"Somewrongpasswrasd","username":"gerogesp"}"#),
    )
    .await;
    assert_eq!(resp.status(), 401);

    let resp = send(&app, "POST", "/auth/login", None, s(USER1)).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let decoded = ppo_api::auth::verify_jwt(&token).expect("token decodes");
    assert_eq!(decoded.role, 0);

    let resp = send(&app, "GET", "/auth/refreshToken", None, None).await;
    assert_eq!(resp.status(), 401);

    let resp = send(&app, "GET", "/auth/refreshToken", Some(&token1), None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert!(body["token"].is_string());
}

#[tokio::test]
async fn admin_login_role_gate() {
    let (app, pool) = app_with_clean_db().await;
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let _body = body_string(resp).await;
    sqlx::query("INSERT INTO \"UserRoles\" (\"id\", \"role\", \"userEmail\") VALUES ($1, 2, $2)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind("george@gmail.com")
        .execute(&pool)
        .await
        .unwrap();

    let _ = send(&app, "POST", "/auth/register", None, s(USER2)).await;

    let resp = send(&app, "POST", "/auth/admin-login", None, s(USER2)).await;
    assert_eq!(resp.status(), 401, "normal user cannot admin-login");
    let resp = send(&app, "POST", "/auth/admin-login", None, s(USER1)).await;
    assert_eq!(resp.status(), 200, "admin can admin-login");
    let body = body_string(resp).await;
    assert!(body["token"].is_string());
}

#[tokio::test]
async fn fetch_round_validation() {
    let (app, _pool) = app_with_clean_db().await;
    let resp = send(
        &app,
        "GET",
        "/poker/fetchRound?boardState=0&totalHands=2&totalKnownHands=2",
        None,
        None,
    )
    .await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert_eq!(body["myHand"].as_array().unwrap().len(), 2);

    for qs in [
        "boardState=5&totalHands=2&totalKnownHands=2",
        "boardState=0&totalHands=0&totalKnownHands=0",
        "boardState=0&totalHands=10&totalKnownHands=2",
        "boardState=0&totalHands=2&totalKnownHands=5",
    ] {
        let resp = send(&app, "GET", &format!("/poker/fetchRound?{qs}"), None, None).await;
        assert_eq!(resp.status(), 400, "expected 400 for {qs}");
    }
}

#[tokio::test]
async fn fetch_random_round() {
    let (app, _pool) = app_with_clean_db().await;
    let resp = send(&app, "GET", "/poker/fetchRandomRound", None, None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert_eq!(body["myHand"].as_array().unwrap().len(), 2);
    let opponents = body["opponentsHands"].as_array().unwrap();
    assert!(!opponents.is_empty() && opponents.len() <= 8);
    assert!(body["board"].as_array().unwrap().len() <= 5);
}

#[tokio::test]
async fn post_new_round_answer_full_pipeline() {
    let (app, pool) = app_with_clean_db().await;

    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    for payload in [
        r#"{"round":{"myHand":["5d","Jhhh"],"opponentsHands":[["..",".123."]],"board":[]},"estimate":50.45,"someValue":5}"#,
        r#"{}"#,
        r#"{"round":{"myHand":["5d","Jh"],"opponentsHands":[["..",".."]],"board":[30]},"estimate":"fasolakia","someValue":5}"#,
    ] {
        let resp = send(&app, "POST", "/poker/postNewRoundAnswer", None, s(payload)).await;
        assert_eq!(resp.status(), 400, "expected 400 for {payload}");
    }

    let resp = send(&app, "POST", "/poker/postNewRoundAnswer", None, s(NEW_ROUND_VALID_1)).await;
    assert_eq!(resp.status(), 200, "anonymous valid round should pass");
    let body = body_string(resp).await;
    assert!(body["roundId"].is_string());
    assert!(body["odds"].is_number());

    let rounds: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Rounds\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(rounds, 1);
    // myHand column stores the 2-card array, not the whole round object
    let my_hand: serde_json::Value =
        sqlx::query_scalar("SELECT \"myHand\" FROM \"Rounds\" LIMIT 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(my_hand, serde_json::json!(["5d", "Jh"]));
    let answers: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"RoundAnswers\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(answers, 1);

    let resp = send(
        &app,
        "POST",
        "/poker/postNewRoundAnswer",
        Some(&token),
        s(NEW_ROUND_VALID_1),
    )
    .await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let score1 = body["score"].as_f64().unwrap();
    let user_score: rust_decimal::Decimal =
        sqlx::query_scalar("SELECT \"score\" FROM \"Users\" WHERE \"username\" = 'gerogesp'")
            .fetch_one(&pool)
            .await
            .unwrap();
    use rust_decimal::prelude::ToPrimitive;
    assert_eq!(user_score.to_f64().unwrap(), score1);

    let resp = send(
        &app,
        "POST",
        "/poker/postNewRoundAnswer",
        Some(&token),
        s(NEW_ROUND_VALID_2),
    )
    .await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let score2 = body["score"].as_f64().unwrap();

    let user_score: rust_decimal::Decimal =
        sqlx::query_scalar("SELECT \"score\" FROM \"Users\" WHERE \"username\" = 'gerogesp'")
            .fetch_one(&pool)
            .await
            .unwrap();
    let expected = ((score1 + score2) / 2.0 * 100.0).round() / 100.0;
    assert!(
        (user_score.to_f64().unwrap() - expected).abs() < 0.02,
        "running score {user_score} vs expected {expected}"
    );

    let answer_events: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM \"Events\" WHERE \"type\" = 'USER_POSTED_ANSWER'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(answer_events, 3);
}

#[tokio::test]
async fn post_existing_round_answer() {
    let (app, pool) = app_with_clean_db().await;
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let body = body_string(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let resp = send(&app, "POST", "/poker/postNewRoundAnswer", None, s(NEW_ROUND_VALID_1)).await;
    let body = body_string(resp).await;
    let round_id = body["roundId"].as_str().unwrap().to_string();

    let rounds_before: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Rounds\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(rounds_before, 1);

    let payload = format!(r#"{{"roundId":"{round_id}","estimate":50}}"#);
    let resp = send(
        &app,
        "POST",
        "/poker/postExistingRoundAnswer",
        Some(&token),
        s(&payload),
    )
    .await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert_eq!(body["roundId"], round_id);

    let rounds_after: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Rounds\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(rounds_after, 1, "no new round created for existing round");
}

#[tokio::test]
async fn fetch_round_by_id() {
    let (app, pool) = app_with_clean_db().await;
    let round_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO \"Rounds\" (\"id\", \"myHand\", \"opponentsHands\", \"board\", \"odds\") VALUES ($1, $2, $3, $4, 50)",
    )
    .bind(&round_id)
    .bind(serde_json::json!(["5d", "Jh"]))
    .bind(serde_json::json!([["..", ".."]]))
    .bind(serde_json::json!([]))
    .execute(&pool)
    .await
    .unwrap();

    let resp = send(&app, "GET", &format!("/poker/fetchRoundById/{round_id}"), None, None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert_eq!(body["myHand"], serde_json::json!(["5d", "Jh"]));

    let resp = send(&app, "GET", "/poker/fetchRoundById/nonexistent-id", None, None).await;
    assert_eq!(resp.status(), 404);
}

#[tokio::test]
async fn favorites_flow() {
    let (app, pool) = app_with_clean_db().await;
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let body = body_string(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let round_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO \"Rounds\" (\"id\", \"myHand\", \"opponentsHands\", \"board\", \"odds\") VALUES ($1, $2, $3, $4, 50)",
    )
    .bind(&round_id)
    .bind(serde_json::json!(["5d", "Jh"]))
    .bind(serde_json::json!([["..", ".."]]))
    .bind(serde_json::json!([]))
    .execute(&pool)
    .await
    .unwrap();

    let resp = send(&app, "PUT", &format!("/poker/addToFavorites/{round_id}"), None, s("{}")).await;
    assert_eq!(resp.status(), 401);

    let resp = send(
        &app,
        "PUT",
        &format!("/poker/addToFavorites/{round_id}"),
        Some(&token),
        s("{}"),
    )
    .await;
    assert_eq!(resp.status(), 204);

    let resp = send(
        &app,
        "PUT",
        &format!("/poker/addToFavorites/{round_id}"),
        Some(&token),
        s("{}"),
    )
    .await;
    assert_eq!(resp.status(), 304);

    let resp = send(
        &app,
        "PUT",
        &format!("/poker/removeFromFavorites/{round_id}"),
        Some(&token),
        s("{}"),
    )
    .await;
    assert_eq!(resp.status(), 204);

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"UserFavoriteRounds\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn leaderboards_flow() {
    let (app, pool) = app_with_clean_db().await;
    std::env::set_var("LEADERBOARD_MIN_GAMES", "0");
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    assert_eq!(resp.status(), 200);

    sqlx::query("UPDATE \"Users\" SET \"score\" = 5 WHERE \"username\" = 'gerogesp'")
        .execute(&pool)
        .await
        .unwrap();

    let resp = send(&app, "GET", "/poker/fetchLeaderboards", None, None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let rows = body.as_array().unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0]["username"], "gerogesp");
    assert_eq!(rows[0]["score"], 5.0);
    assert_eq!(rows[0]["gamesPlayed"], 0);
}

#[tokio::test]
async fn leaderboards_multi_user_min_games() {
    let (app, pool) = app_with_clean_db().await;
    std::env::set_var("LEADERBOARD_MIN_GAMES", "0");
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let body = body_string(resp).await;
    let token1 = body["token"].as_str().unwrap().to_string();
    let resp = send(&app, "POST", "/auth/register", None, s(USER2)).await;
    let body = body_string(resp).await;
    let token2 = body["token"].as_str().unwrap().to_string();

    // user1 plays one new round; user2 plays one new + one existing
    let resp = send(
        &app,
        "POST",
        "/poker/postNewRoundAnswer",
        Some(&token1),
        s(NEW_ROUND_VALID_2),
    )
    .await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let round_id = body["roundId"].as_str().unwrap().to_string();

    let resp = send(
        &app,
        "POST",
        "/poker/postNewRoundAnswer",
        Some(&token2),
        s(NEW_ROUND_VALID_1),
    )
    .await;
    assert_eq!(resp.status(), 200);

    let payload = format!(r#"{{"roundId":"{round_id}","estimate":50}}"#);
    let resp = send(
        &app,
        "POST",
        "/poker/postExistingRoundAnswer",
        Some(&token2),
        s(&payload),
    )
    .await;
    assert_eq!(resp.status(), 200);

    let answers: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"RoundAnswers\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(answers, 3);

    // LEADERBOARD_MIN_GAMES=2 filters user1 (1 distinct round) out, keeps user2
    std::env::set_var("LEADERBOARD_MIN_GAMES", "2");
    let resp = send(&app, "GET", "/poker/fetchLeaderboards", None, None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    let rows = body.as_array().unwrap();
    assert_eq!(rows.len(), 1, "only user2 clears min-games 2");
    assert_eq!(rows[0]["gamesPlayed"], 2);
    std::env::set_var("LEADERBOARD_MIN_GAMES", "0");
}

#[tokio::test]
async fn user_profile_masking() {
    let (app, pool) = app_with_clean_db().await;
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let body = body_string(resp).await;
    let token1 = body["token"].as_str().unwrap().to_string();

    let round_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO \"Rounds\" (\"id\", \"myHand\", \"opponentsHands\", \"board\", \"odds\") VALUES ($1, $2, $3, $4, 33.33)",
    )
    .bind(&round_id)
    .bind(serde_json::json!(["5d", "Jh"]))
    .bind(serde_json::json!([["..", ".."]]))
    .bind(serde_json::json!([]))
    .execute(&pool)
    .await
    .unwrap();
    let user_id: String =
        sqlx::query_scalar("SELECT \"id\" FROM \"Users\" WHERE \"username\" = 'gerogesp'")
            .fetch_one(&pool)
            .await
            .unwrap();
    sqlx::query("INSERT INTO \"RoundAnswers\" (\"id\", \"estimate\", \"userId\", \"roundId\") VALUES ($1, 30, $2, $3)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&user_id)
        .bind(&round_id)
        .execute(&pool)
        .await
        .unwrap();

    let url = "/user/fetchByUsername/gerogesp";
    let resp = send(&app, "GET", url, Some(&token1), None).await;
    assert_eq!(resp.status(), 200);
    let body = body_string(resp).await;
    assert_eq!(body["username"], "gerogesp");
    assert!(body["rank"].is_i64());
    assert_eq!(body["rounds"].as_array().unwrap().len(), 1);
    assert_eq!(body["rounds"][0]["odds"], 33.33);
    assert_eq!(body["rounds"][0]["estimate"], 30.0);
    assert_eq!(body["rounds"][0]["score"], 3.33);
    assert_eq!(body["roundFavoritesIds"].as_array().unwrap().len(), 0);

    let resp = send(&app, "POST", "/auth/register", None, s(USER2)).await;
    let body = body_string(resp).await;
    let token2 = body["token"].as_str().unwrap().to_string();
    let resp = send(&app, "GET", url, Some(&token2), None).await;
    let body = body_string(resp).await;
    assert_eq!(body["rounds"][0]["odds"], -1.0);
    assert_eq!(body["rounds"][0]["estimate"], -1.0);

    let resp = send(&app, "GET", "/user/fetchByUsername/ghost", None, None).await;
    assert_eq!(resp.status(), 404);
}

#[tokio::test]
async fn user_update_flow() {
    let (app, pool) = app_with_clean_db().await;
    let resp = send(&app, "POST", "/auth/register", None, s(USER1)).await;
    let body = body_string(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let resp = send(&app, "PUT", "/user/update", None, s(r#"{"username":"x"}"#)).await;
    assert_eq!(resp.status(), 401);

    let resp = send(
        &app,
        "PUT",
        "/user/update",
        Some(&token),
        s(r#"{"username":"gerogesp2","password":"newpass"}"#),
    )
    .await;
    assert_eq!(resp.status(), 204);
    let (hash, username): (String, String) = sqlx::query_as(
        "SELECT \"hash\", \"username\" FROM \"Users\" WHERE \"email\" = 'george@gmail.com'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(username, "gerogesp2");
    assert!(hash.starts_with("$argon2id$"));

    let resp = send(&app, "POST", "/auth/login", None, s(USER1)).await;
    assert_eq!(resp.status(), 401, "old password rejected after update");
    let resp = send(
        &app,
        "POST",
        "/auth/login",
        None,
        s(r#"{"email":"george@gmail.com","password":"newpass","username":"gerogesp2"}"#),
    )
    .await;
    assert_eq!(resp.status(), 200, "new password accepted");
}
