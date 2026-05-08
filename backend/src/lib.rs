pub mod config;
pub mod cors;
pub mod db;
pub mod handlers;

use rocket::{routes, Build, Rocket};
use rocket_cors::Cors;
use sqlx::PgPool;

/// Fully wired HTTP stack (PostgreSQL pool + CORS). Callers supply the pool after connecting.
pub fn build_rocket(pool: PgPool, cors: Cors) -> Rocket<Build> {
    rocket::build()
        .attach(cors)
        .manage(pool)
        .mount("/", routes![handlers::health::health])
}
