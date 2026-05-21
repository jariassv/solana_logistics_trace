use chrono::{DateTime, Utc};
use sqlx::PgPool;

pub async fn wallet_by_registration_tx_hash(
    pool: &PgPool,
    tx_hash: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"SELECT wallet FROM actors WHERE registration_tx_hash = $1"#,
    )
    .bind(tx_hash)
    .fetch_optional(pool)
    .await
}

pub async fn wallet_exists_for_wallet(
    pool: &PgPool,
    wallet: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT wallet FROM actors WHERE wallet = $1"#)
        .bind(wallet)
        .fetch_optional(pool)
        .await
}

pub async fn update_actor_from_chain_sync(
    pool: &PgPool,
    wallet: &str,
    role: &str,
    name: &str,
    location: Option<&String>,
    is_active: bool,
    shipments_created: i32,
    checkpoints_recorded: i32,
    created_at: DateTime<Utc>,
    registration_tx_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"UPDATE actors
           SET role = $2,
               name = $3,
               location = $4,
               is_active = $5,
               shipments_created = $6,
               checkpoints_recorded = $7,
               created_at = $8,
               registration_tx_hash = $9
           WHERE wallet = $1"#,
    )
    .bind(wallet)
    .bind(role)
    .bind(name)
    .bind(location)
    .bind(is_active)
    .bind(shipments_created)
    .bind(checkpoints_recorded)
    .bind(created_at)
    .bind(registration_tx_hash)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_actor(
    pool: &PgPool,
    wallet: &str,
    role: &str,
    name: &str,
    location: Option<&String>,
    is_active: bool,
    shipments_created: i32,
    checkpoints_recorded: i32,
    created_at: DateTime<Utc>,
    registration_tx_hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO actors (wallet, role, name, location, is_active, shipments_created, checkpoints_recorded, created_at, registration_tx_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
    )
    .bind(wallet)
    .bind(role)
    .bind(name)
    .bind(location)
    .bind(is_active)
    .bind(shipments_created)
    .bind(checkpoints_recorded)
    .bind(created_at)
    .bind(registration_tx_hash)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn select_actor_row(
    pool: &PgPool,
    wallet: &str,
) -> Result<(String, String, String, Option<String>, Option<String>), sqlx::Error> {
    sqlx::query_as(
        r#"SELECT wallet, role, name, location, registration_tx_hash FROM actors WHERE wallet = $1"#,
    )
    .bind(wallet)
    .fetch_one(pool)
    .await
}

pub async fn select_role_for_wallet(
    pool: &PgPool,
    wallet: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT role FROM actors WHERE wallet = $1"#)
        .bind(wallet)
        .fetch_optional(pool)
        .await
}

pub async fn select_actor_optional(
    pool: &PgPool,
    wallet: &str,
) -> Result<Option<(String, String, String, Option<String>, Option<String>)>, sqlx::Error> {
    sqlx::query_as(
        r#"SELECT wallet, role, name, location, registration_tx_hash FROM actors WHERE wallet = $1"#,
    )
    .bind(wallet)
    .fetch_optional(pool)
    .await
}

/// Nombres y roles registrados para un conjunto de wallets (detalle de envío / checkpoints).
pub async fn select_summaries_for_wallets(
    pool: &PgPool,
    wallets: &[String],
) -> Result<std::collections::HashMap<String, (String, String)>, sqlx::Error> {
    if wallets.is_empty() {
        return Ok(std::collections::HashMap::new());
    }
    let rows: Vec<(String, String, String)> = sqlx::query_as(
        r#"SELECT wallet, name, role FROM actors WHERE wallet = ANY($1)"#,
    )
    .bind(wallets)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|(wallet, name, role)| (wallet, (name, role)))
        .collect())
}

/// Actores con rol Recipient activos, para selector de destinatario al crear envíos.
pub async fn list_active_recipients(
    pool: &PgPool,
) -> Result<Vec<(String, String)>, sqlx::Error> {
    sqlx::query_as(
        r#"SELECT wallet, name
           FROM actors
           WHERE role = 'Recipient' AND is_active = true
           ORDER BY name ASC, wallet ASC"#,
    )
    .fetch_all(pool)
    .await
}
