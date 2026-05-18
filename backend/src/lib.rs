pub mod access;
pub mod config;
pub mod cors;
pub mod db;
pub mod domain;
pub mod dto;
pub mod handlers;
pub mod repos;
pub mod services;
pub mod solana;
pub mod wallet_query;

use std::sync::Arc;

use rocket::{routes, Build, Rocket};
use rocket_cors::Cors;
use sqlx::PgPool;

use crate::config::AppConfig;
use crate::solana::SolanaRpcClient;

/// Fully wired HTTP stack (PostgreSQL pool, CORS, read-only Solana RPC).
pub fn build_rocket(
    pool: PgPool,
    cors: Cors,
    solana: Arc<dyn SolanaRpcClient>,
    cfg: AppConfig,
) -> Rocket<Build> {
    rocket::build()
        .attach(cors)
        .manage(pool)
        .manage(solana)
        .manage(cfg)
        .mount("/", routes![handlers::health::health])
        .mount(
            "/api/v1",
            routes![
                handlers::solana::solana_health_rpc,
                handlers::catalogs::get_actor_roles,
                handlers::catalogs::get_checkpoint_types,
                handlers::catalogs::get_shipment_statuses,
                handlers::catalogs::get_incident_types,
                handlers::catalogs::get_products,
                handlers::catalogs::get_locations,
                handlers::sync::post_sync_actor,
                handlers::sync::post_sync_shipment,
                handlers::sync::post_sync_checkpoint,
                handlers::shipments::list_shipments,
                handlers::shipments::list_shipment_checkpoints,
                handlers::shipments::get_shipment,
                handlers::public_shipments::get_public_shipment,
                handlers::actors::list_recipients,
                handlers::actors::get_actor_me,
            ],
        )
}

#[cfg(test)]
mod tests;
