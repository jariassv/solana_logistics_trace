pub mod config;
pub mod cors;
pub mod db;
pub mod handlers;
pub mod solana;

use std::sync::Arc;

use rocket::{routes, Build, Rocket};
use rocket_cors::Cors;
use sqlx::PgPool;

use crate::solana::SolanaRpcClient;

/// Fully wired HTTP stack (PostgreSQL pool, CORS, read-only Solana RPC).
pub fn build_rocket(
    pool: PgPool,
    cors: Cors,
    solana: Arc<dyn SolanaRpcClient>,
) -> Rocket<Build> {
    rocket::build()
        .attach(cors)
        .manage(pool)
        .manage(solana)
        .mount("/", routes![handlers::health::health])
        .mount(
            "/api/v1",
            routes![handlers::solana::solana_health_rpc],
        )
}

#[cfg(test)]
mod tests;
