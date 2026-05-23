use serde_json::Value;
use sqlx::postgres::PgRow;
use sqlx::types::Json;
use sqlx::{Error as SqlxError, FromRow, PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

use crate::access::operational_roles_see_all_shipments;
use crate::repos::actors;

pub async fn checkpoint_id_by_tx_hash(
    pool: &PgPool,
    tx_hash: &str,
) -> Result<Option<i64>, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT id FROM checkpoints WHERE tx_hash = $1"#)
        .bind(tx_hash)
        .fetch_optional(pool)
        .await
}

pub async fn shipment_db_id_by_on_chain_id(
    pool: &PgPool,
    on_chain_shipment_id: i64,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT id FROM shipments WHERE on_chain_shipment_id = $1"#)
        .bind(on_chain_shipment_id)
        .fetch_optional(pool)
        .await
}

/// Row for ordered checkpoint lists (Etapa 2 GET).
#[derive(Debug)]
pub struct CheckpointListRow {
    pub id: i64,
    pub on_chain_checkpoint_id: i64,
    pub checkpoint_type: String,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
    pub location: Option<String>,
    pub actor_wallet: String,
    pub temperature_centi: Option<i16>,
    pub humidity: Option<i16>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub metadata_json: Option<Json<Value>>,
    pub tx_hash: String,
}

impl<'r> FromRow<'r, PgRow> for CheckpointListRow {
    fn from_row(row: &'r PgRow) -> Result<Self, SqlxError> {
        Ok(CheckpointListRow {
            id: row.try_get("id")?,
            on_chain_checkpoint_id: row.try_get("on_chain_checkpoint_id")?,
            checkpoint_type: row.try_get("checkpoint_type")?,
            occurred_at: row.try_get("occurred_at")?,
            location: row.try_get("location")?,
            actor_wallet: row.try_get("actor_wallet")?,
            temperature_centi: row.try_get("temperature_centi")?,
            humidity: row.try_get("humidity")?,
            latitude: row.try_get("latitude")?,
            longitude: row.try_get("longitude")?,
            metadata_json: row.try_get("metadata_json")?,
            tx_hash: row.try_get("tx_hash")?,
        })
    }
}

pub async fn list_for_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<Vec<CheckpointListRow>, sqlx::Error> {
    sqlx::query_as::<_, CheckpointListRow>(
        r#"SELECT c.id, c.on_chain_checkpoint_id, c.checkpoint_type, c.occurred_at, c.location,
                  c.actor_wallet, c.temperature_centi, c.humidity, c.latitude, c.longitude,
                  c.metadata_json, c.tx_hash
           FROM checkpoints c
           WHERE c.shipment_id = $1
           ORDER BY c.occurred_at ASC"#,
    )
    .bind(shipment_id)
    .fetch_all(pool)
    .await
}

/// Checkpoints for a shipment when `wallet` is sender or recipient (§8.2).
pub async fn list_for_shipment_participant(
    pool: &PgPool,
    shipment_id: Uuid,
    wallet: &str,
) -> Result<Vec<CheckpointListRow>, sqlx::Error> {
    sqlx::query_as::<_, CheckpointListRow>(
        r#"SELECT c.id, c.on_chain_checkpoint_id, c.checkpoint_type, c.occurred_at, c.location,
                  c.actor_wallet, c.temperature_centi, c.humidity, c.latitude, c.longitude,
                  c.metadata_json, c.tx_hash
           FROM checkpoints c
           INNER JOIN shipments s ON s.id = c.shipment_id
           WHERE c.shipment_id = $1
             AND (s.sender_wallet = $2 OR s.recipient_wallet = $2)
           ORDER BY c.occurred_at ASC"#,
    )
    .bind(shipment_id)
    .bind(wallet)
    .fetch_all(pool)
    .await
}

pub async fn list_for_shipment_wallet(
    pool: &PgPool,
    shipment_id: Uuid,
    wallet: &str,
) -> Result<Vec<CheckpointListRow>, sqlx::Error> {
    let role = actors::select_role_for_wallet(pool, wallet).await?;
    if role
        .as_deref()
        .is_some_and(operational_roles_see_all_shipments)
    {
        list_for_shipment(pool, shipment_id).await
    } else {
        list_for_shipment_participant(pool, shipment_id, wallet).await
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_checkpoint(
    tx: &mut Transaction<'_, Postgres>,
    shipment_id: Uuid,
    on_chain_checkpoint_id: i64,
    actor_wallet: &str,
    checkpoint_type: &str,
    location: &str,
    latitude: Option<f64>,
    longitude: Option<f64>,
    temperature: Option<i16>,
    humidity: Option<i16>,
    metadata_json: &Value,
    occurred_at: chrono::DateTime<chrono::Utc>,
    tx_hash: &str,
    slot: Option<i64>,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        r#"INSERT INTO checkpoints (
               shipment_id, on_chain_checkpoint_id, actor_wallet, checkpoint_type,
               location, latitude, longitude, temperature_centi, humidity,
               metadata_json, occurred_at, tx_hash, slot
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id"#,
    )
    .bind(shipment_id)
    .bind(on_chain_checkpoint_id)
    .bind(actor_wallet)
    .bind(checkpoint_type)
    .bind(location)
    .bind(latitude)
    .bind(longitude)
    .bind(temperature)
    .bind(humidity)
    .bind(Json(metadata_json))
    .bind(occurred_at)
    .bind(tx_hash)
    .bind(slot)
    .fetch_one(&mut **tx)
    .await
}

pub async fn select_shipment_status(
    tx: &mut Transaction<'_, Postgres>,
    shipment_id: Uuid,
) -> Result<String, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT status FROM shipments WHERE id = $1"#)
        .bind(shipment_id)
        .fetch_one(&mut **tx)
        .await
}

pub async fn bump_checkpoint_count_update_status(
    tx: &mut Transaction<'_, Postgres>,
    shipment_id: Uuid,
    next_status: Option<&str>,
    delivered_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<(), sqlx::Error> {
    if let Some(next) = next_status {
        if next == "Delivered" {
            sqlx::query(
                r#"UPDATE shipments
                   SET checkpoint_count = checkpoint_count + 1,
                       status = $2,
                       delivered_at = COALESCE(delivered_at, $3)
                   WHERE id = $1"#,
            )
            .bind(shipment_id)
            .bind(next)
            .bind(delivered_at)
            .execute(&mut **tx)
            .await?;
        } else {
            sqlx::query(
                r#"UPDATE shipments SET checkpoint_count = checkpoint_count + 1, status = $2 WHERE id = $1"#,
            )
            .bind(shipment_id)
            .bind(next)
            .execute(&mut **tx)
            .await?;
        }
    } else {
        sqlx::query(r#"UPDATE shipments SET checkpoint_count = checkpoint_count + 1 WHERE id = $1"#)
            .bind(shipment_id)
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

/// Corrige envíos con checkpoint `Delivered` pero estado desactualizado (p. ej. sync previo).
pub async fn reconcile_delivered_status(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"UPDATE shipments s
           SET status = 'Delivered',
               delivered_at = COALESCE(
                   s.delivered_at,
                   (SELECT MAX(c.occurred_at)
                    FROM checkpoints c
                    WHERE c.shipment_id = s.id AND c.type = 'Delivered')
               )
           WHERE s.id = $1
             AND s.status NOT IN ('Delivered', 'Cancelled', 'Returned')
             AND EXISTS (
                 SELECT 1 FROM checkpoints c
                 WHERE c.shipment_id = s.id AND c.type = 'Delivered'
             )"#,
    )
    .bind(shipment_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Actualiza `last_checkpoint_at` tras un checkpoint logístico on-chain.
pub async fn touch_last_logistics_checkpoint(
    tx: &mut Transaction<'_, Postgres>,
    shipment_id: Uuid,
    occurred_at: chrono::DateTime<chrono::Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"UPDATE shipments SET last_checkpoint_at = $2 WHERE id = $1"#,
    )
    .bind(shipment_id)
    .bind(occurred_at)
    .execute(&mut **tx)
    .await?;
    Ok(())
}
