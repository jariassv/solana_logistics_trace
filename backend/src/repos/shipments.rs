use chrono::{DateTime, Utc};
use sqlx::postgres::PgRow;
use sqlx::{Error as SqlxError, FromRow, PgPool, Row};
use uuid::Uuid;

use crate::access::{is_carrier_role, operational_roles_see_all_shipments};
use crate::dto::shipment_details::{ShipmentDetailsPersist, ShipmentDetailsRow, PRIORITY_NORMAL};
use crate::repos::actors;

/// Row for `GET /shipments?wallet=` list responses.
#[derive(Debug)]
pub struct ShipmentListRow {
    pub id: Uuid,
    pub on_chain_shipment_id: i64,
    pub status: String,
    pub product: String,
    pub created_at: DateTime<Utc>,
    pub requires_cold_chain: bool,
}

impl<'r> FromRow<'r, PgRow> for ShipmentListRow {
    fn from_row(row: &'r PgRow) -> Result<Self, SqlxError> {
        Ok(ShipmentListRow {
            id: row.try_get("id")?,
            on_chain_shipment_id: row.try_get("on_chain_shipment_id")?,
            status: row.try_get("status")?,
            product: row.try_get("product")?,
            created_at: row.try_get("created_at")?,
            requires_cold_chain: row.try_get("requires_cold_chain")?,
        })
    }
}

/// Full shipment row when the wallet is sender or recipient.
#[derive(Debug)]
pub struct ShipmentDetailRow {
    pub id: Uuid,
    pub on_chain_shipment_id: i64,
    pub sender_wallet: String,
    pub recipient_wallet: String,
    pub carrier_wallet: Option<String>,
    pub product: String,
    pub origin: String,
    pub destination: String,
    pub status: String,
    pub requires_cold_chain: bool,
    pub checkpoint_count: i32,
    pub incident_count: i32,
    pub created_at: DateTime<Utc>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub creation_tx_hash: String,
    pub details: ShipmentDetailsRow,
}

const SHIPMENT_DETAIL_SELECT: &str = r#"SELECT id, on_chain_shipment_id, sender_wallet, recipient_wallet, carrier_wallet,
                  product, origin, destination, status, requires_cold_chain, checkpoint_count, incident_count,
                  created_at, delivered_at, creation_tx_hash,
                  weight_kg, quantity, quantity_unit, estimated_delivery_at, reference_code, priority, notes"#;

impl<'r> FromRow<'r, PgRow> for ShipmentDetailRow {
    fn from_row(row: &'r PgRow) -> Result<Self, SqlxError> {
        Ok(ShipmentDetailRow {
            id: row.try_get("id")?,
            on_chain_shipment_id: row.try_get("on_chain_shipment_id")?,
            sender_wallet: row.try_get("sender_wallet")?,
            recipient_wallet: row.try_get("recipient_wallet")?,
            carrier_wallet: row.try_get("carrier_wallet")?,
            product: row.try_get("product")?,
            origin: row.try_get("origin")?,
            destination: row.try_get("destination")?,
            status: row.try_get("status")?,
            requires_cold_chain: row.try_get("requires_cold_chain")?,
            checkpoint_count: row.try_get("checkpoint_count")?,
            incident_count: row.try_get("incident_count")?,
            created_at: row.try_get("created_at")?,
            delivered_at: row.try_get("delivered_at")?,
            creation_tx_hash: row.try_get("creation_tx_hash")?,
            details: ShipmentDetailsRow::from_pg_row(row)?,
        })
    }
}

pub async fn list_shipments_as_participant(
    pool: &PgPool,
    wallet: &str,
) -> Result<Vec<ShipmentListRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentListRow>(
        r#"SELECT id, on_chain_shipment_id, status, product, created_at, requires_cold_chain
           FROM shipments
           WHERE sender_wallet = $1 OR recipient_wallet = $1
           ORDER BY created_at DESC"#,
    )
    .bind(wallet)
    .fetch_all(pool)
    .await
}

pub async fn list_shipments_as_carrier(
    pool: &PgPool,
    wallet: &str,
) -> Result<Vec<ShipmentListRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentListRow>(
        r#"SELECT id, on_chain_shipment_id, status, product, created_at, requires_cold_chain
           FROM shipments
           WHERE carrier_wallet = $1
           ORDER BY created_at DESC"#,
    )
    .bind(wallet)
    .fetch_all(pool)
    .await
}

pub async fn list_all_shipments(pool: &PgPool) -> Result<Vec<ShipmentListRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentListRow>(
        r#"SELECT id, on_chain_shipment_id, status, product, created_at, requires_cold_chain
           FROM shipments
           ORDER BY created_at DESC"#,
    )
    .fetch_all(pool)
    .await
}

pub async fn list_shipments_for_wallet(
    pool: &PgPool,
    wallet: &str,
) -> Result<Vec<ShipmentListRow>, sqlx::Error> {
    let role = actors::select_role_for_wallet(pool, wallet).await?;
    match role.as_deref() {
        Some(r) if operational_roles_see_all_shipments(r) => list_all_shipments(pool).await,
        Some(r) if is_carrier_role(r) => list_shipments_as_carrier(pool, wallet).await,
        _ => list_shipments_as_participant(pool, wallet).await,
    }
}

pub async fn select_shipment_detail_by_id(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<Option<ShipmentDetailRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentDetailRow>(
        &format!("{SHIPMENT_DETAIL_SELECT} FROM shipments WHERE id = $1"),
    )
    .bind(shipment_id)
    .fetch_optional(pool)
    .await
}

pub async fn select_shipment_detail_for_participant(
    pool: &PgPool,
    shipment_id: Uuid,
    wallet: &str,
) -> Result<Option<ShipmentDetailRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentDetailRow>(
        &format!(
            "{SHIPMENT_DETAIL_SELECT} FROM shipments WHERE id = $1 AND (sender_wallet = $2 OR recipient_wallet = $2)"
        ),
    )
    .bind(shipment_id)
    .bind(wallet)
    .fetch_optional(pool)
    .await
}

pub async fn select_shipment_detail_for_carrier(
    pool: &PgPool,
    shipment_id: Uuid,
    wallet: &str,
) -> Result<Option<ShipmentDetailRow>, sqlx::Error> {
    sqlx::query_as::<_, ShipmentDetailRow>(
        &format!("{SHIPMENT_DETAIL_SELECT} FROM shipments WHERE id = $1 AND carrier_wallet = $2"),
    )
    .bind(shipment_id)
    .bind(wallet)
    .fetch_optional(pool)
    .await
}

pub async fn select_shipment_detail_for_wallet(
    pool: &PgPool,
    shipment_id: Uuid,
    wallet: &str,
) -> Result<Option<ShipmentDetailRow>, sqlx::Error> {
    let role = actors::select_role_for_wallet(pool, wallet).await?;
    match role.as_deref() {
        Some(r) if operational_roles_see_all_shipments(r) => {
            select_shipment_detail_by_id(pool, shipment_id).await
        }
        Some(r) if is_carrier_role(r) => {
            select_shipment_detail_for_carrier(pool, shipment_id, wallet).await
        }
        _ => select_shipment_detail_for_participant(pool, shipment_id, wallet).await,
    }
}

pub async fn select_status_by_id(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<String, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT status FROM shipments WHERE id = $1"#)
        .bind(shipment_id)
        .fetch_one(pool)
        .await
}

pub async fn update_carrier_wallet(
    pool: &PgPool,
    shipment_id: Uuid,
    carrier_wallet: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE shipments SET carrier_wallet = $2 WHERE id = $1"#)
        .bind(shipment_id)
        .bind(carrier_wallet)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn id_by_on_chain_shipment_id(
    pool: &PgPool,
    on_chain_shipment_id: i64,
) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query(r#"SELECT id FROM shipments WHERE on_chain_shipment_id = $1"#)
        .bind(on_chain_shipment_id)
        .fetch_optional(pool)
        .await?;
    match row {
        None => Ok(None),
        Some(r) => {
            let id: Uuid = r.try_get("id")?;
            Ok(Some(id))
        }
    }
}

/// Alinea `shipments.status` con incidencias de pérdida ya registradas.
pub async fn reconcile_lost_status(pool: &PgPool, shipment_id: Uuid) -> Result<bool, sqlx::Error> {
    let updated: Option<Uuid> = sqlx::query_scalar(
        r#"UPDATE shipments SET status = 'Lost'
           WHERE id = $1
             AND status NOT IN ('Lost', 'Cancelled', 'Delivered')
             AND EXISTS (
                 SELECT 1 FROM incidents i
                 WHERE i.shipment_id = $1
                   AND i.incident_type IN ('Lost', 'SHIPMENT_LOST')
             )
           RETURNING id"#,
    )
    .bind(shipment_id)
    .fetch_optional(pool)
    .await?;
    Ok(updated.is_some())
}

pub async fn update_status(
    pool: &PgPool,
    shipment_id: Uuid,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE shipments SET status = $2 WHERE id = $1"#)
        .bind(shipment_id)
        .bind(status)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn sync_incident_count(
    pool: &PgPool,
    shipment_id: Uuid,
    incident_count: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE shipments SET incident_count = $2 WHERE id = $1"#)
        .bind(shipment_id)
        .bind(incident_count)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn id_by_creation_tx_hash(
    pool: &PgPool,
    creation_tx_hash: &str,
) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query(r#"SELECT id FROM shipments WHERE creation_tx_hash = $1"#)
        .bind(creation_tx_hash)
        .fetch_optional(pool)
        .await?;
    match row {
        None => Ok(None),
        Some(r) => {
            let id: Uuid = r.try_get("id")?;
            Ok(Some(id))
        }
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_shipment_returning_id(
    pool: &PgPool,
    on_chain_shipment_id: i64,
    sender_wallet: &str,
    recipient_wallet: &str,
    carrier_wallet: Option<&str>,
    product: &str,
    origin: &str,
    destination: &str,
    status: &str,
    requires_cold_chain: bool,
    checkpoint_count: i32,
    incident_count: i32,
    created_at: DateTime<Utc>,
    delivered_at: Option<DateTime<Utc>>,
    creation_tx_hash: &str,
    details: Option<&ShipmentDetailsPersist>,
) -> Result<Uuid, sqlx::Error> {
    let (
        weight_kg,
        quantity,
        quantity_unit,
        estimated_delivery_at,
        reference_code,
        priority,
        notes,
    ) = details.map_or(
        (
            None::<f64>,
            None::<i32>,
            None::<String>,
            None::<DateTime<Utc>>,
            None::<String>,
            PRIORITY_NORMAL.to_string(),
            None::<String>,
        ),
        |d| {
            (
                d.weight_kg,
                d.quantity,
                d.quantity_unit.clone(),
                d.estimated_delivery_at,
                d.reference_code.clone(),
                d.priority.clone(),
                d.notes.clone(),
            )
        },
    );

    let id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO shipments (
               on_chain_shipment_id, sender_wallet, recipient_wallet, carrier_wallet, product, origin, destination,
               status, requires_cold_chain, checkpoint_count, incident_count, created_at, delivered_at,
               creation_tx_hash, weight_kg, quantity, quantity_unit, estimated_delivery_at,
               reference_code, priority, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING id"#,
    )
    .bind(on_chain_shipment_id)
    .bind(sender_wallet)
    .bind(recipient_wallet)
    .bind(carrier_wallet)
    .bind(product)
    .bind(origin)
    .bind(destination)
    .bind(status)
    .bind(requires_cold_chain)
    .bind(checkpoint_count)
    .bind(incident_count)
    .bind(created_at)
    .bind(delivered_at)
    .bind(creation_tx_hash)
    .bind(weight_kg)
    .bind(quantity)
    .bind(quantity_unit)
    .bind(estimated_delivery_at)
    .bind(reference_code)
    .bind(priority)
    .bind(notes)
    .fetch_one(pool)
    .await?;
    Ok(id)
}
