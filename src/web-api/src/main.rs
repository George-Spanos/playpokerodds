use ppo_api::db;
use ppo_api::routes;
use ppo_api::state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let database_url =
        std::env::var("DB_CONNECTION_STRING").expect("DB_CONNECTION_STRING must be set");
    let pool = db::init_pool(&database_url).await.expect("database init failed");
    let state = AppState {
        db: pool,
        http: reqwest::Client::new(),
    };
    let app = routes::router(state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("port 3000 bind failed");
    tracing::info!("Server is listening on port 3000");
    axum::serve(listener, app).await.expect("server error");
}
