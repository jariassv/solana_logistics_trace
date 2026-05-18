//! Persistencia de `telemetry_events` por `shipment_id` (UUID).

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::incident_engine::models::TelemetryEvent;

pub async fn insert(
    pool: &PgPool,
    event: &TelemetryEvent,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
        r#"INSERT INTO telemetry_events (
               shipment_id, telemetry_type, value_numeric, latitude, longitude,
               metadata_json, recorded_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id"#,
    )
    .bind(event.shipment_id)
    .bind(&event.telemetry_type)
    .bind(event.value_numeric)
    .bind(event.latitude)
    .bind(event.longitude)
    .bind(event.metadata_json.as_ref().map(sqlx::types::Json))
    .bind(event.recorded_at)
    .fetch_one(pool)
    .await
}

pub async fn latest_recorded_at(
    pool: &PgPool,
    shipment_id: Uuid,
    telemetry_type: &str,
) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
    sqlx::query_scalar(
        r#"SELECT recorded_at FROM telemetry_events
           WHERE shipment_id = $1 AND telemetry_type = $2
           ORDER BY recorded_at DESC LIMIT 1"#,
    )
    .bind(shipment_id)
    .bind(telemetry_type)
    .fetch_optional(pool)
    .await
}

#[derive(Debug)]
pub struct TelemetryRow {
    pub id: Uuid,
    pub shipment_id: Uuid,
    pub telemetry_type: String,
    pub value_numeric: Option<f64>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub recorded_at: DateTime<Utc>,
}

pub async fn list_by_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
    limit: i64,
) -> Result<Vec<TelemetryRow>, sqlx::Error> {
    let rows = sqlx::query(
        r#"SELECT id, shipment_id, telemetry_type, value_numeric, latitude, longitude, recorded_at
           FROM telemetry_events
           WHERE shipment_id = $1
           ORDER BY recorded_at DESC
           LIMIT $2"#,
    )
    .bind(shipment_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    rows.iter()
        .map(|row| {
            use sqlx::Row;
            Ok(TelemetryRow {
                id: row.try_get("id")?,
                shipment_id: row.try_get("shipment_id")?,
                telemetry_type: row.try_get("telemetry_type")?,
                value_numeric: row.try_get("value_numeric")?,
                latitude: row.try_get("latitude")?,
                longitude: row.try_get("longitude")?,
                recorded_at: row.try_get("recorded_at")?,
            })
        })
        .collect()
}

pub async fn latest_temperature(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<Option<f64>, sqlx::Error> {
    sqlx::query_scalar(
        r#"SELECT value_numeric FROM telemetry_events
           WHERE shipment_id = $1 AND telemetry_type = 'temperature'
           ORDER BY recorded_at DESC LIMIT 1"#,
    )
    .bind(shipment_id)
    .fetch_optional(pool)
    .await
}
