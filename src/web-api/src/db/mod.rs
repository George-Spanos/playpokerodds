//! Database pool + migration runner.
//!
//! Migrations live in ./migrations/*.sql and run idempotently at startup via a
//! `_ppo_migrations` ledger. Prisma-managed databases already have the schema
//! the baseline declares, so statements run with IF NOT EXISTS semantics where
//! Postgres allows and duplicate errors are ignored per-statement.

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const BASELINE: &str = include_str!("../../migrations/0001_baseline.sql");

pub async fn init_pool(url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(url)
        .await?;
    run_migrations(&pool).await?;
    Ok(pool)
}

async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _ppo_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())",
    )
    .execute(pool)
    .await?;

    let applied: Option<(String,)> =
        sqlx::query_as("SELECT name FROM _ppo_migrations WHERE name = '0001_baseline'")
            .fetch_optional(pool)
            .await?;
    if applied.is_some() {
        return Ok(());
    }

    for statement in BASELINE.split(';') {
        // Strip comment lines, then execute what remains.
        let statement: String = statement
            .lines()
            .filter(|line| !line.trim_start().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string();
        if statement.is_empty() {
            continue;
        }
        // Prisma-created DBs already hold these tables: tolerate "exists" errors.
        let result = sqlx::query(&statement).execute(pool).await;
        if let Err(e) = result {
            let msg = e.to_string();
            if !msg.contains("already exists") {
                return Err(e);
            }
        }
    }

    sqlx::query("INSERT INTO _ppo_migrations (name) VALUES ('0001_baseline')")
        .execute(pool)
        .await?;
    Ok(())
}
