//! Persistencia de `incidents`.

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn insert_auto(
    pool: &PgPool,
    shipment_id: Uuid,
    incident_type: &str,
    severity: &str,
    description: &str,
    evidence_json: &Value,
    rule_name: &str,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
        r#"INSERT INTO incidents (
               shipment_id, incident_type, severity, status, source,
               description, detected_at, evidence_json, rule_name
           ) VALUES ($1, $2, $3, 'Open', 'auto', $4, now(), $5, $6)
           RETURNING id"#,
    )
    .bind(shipment_id)
    .bind(incident_type)
    .bind(severity)
    .bind(description)
    .bind(sqlx::types::Json(evidence_json))
    .bind(rule_name)
    .fetch_one(pool)
    .await
}

pub async fn open_exists(
    pool: &PgPool,
    shipment_id: Uuid,
    incident_type: &str,
) -> Result<bool, sqlx::Error> {
    let n: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)::bigint FROM incidents
           WHERE shipment_id = $1 AND incident_type = $2 AND status = 'Open'"#,
    )
    .bind(shipment_id)
    .bind(incident_type)
    .fetch_one(pool)
    .await?;
    Ok(n > 0)
}

pub async fn bump_shipment_incident_count(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"UPDATE shipments SET incident_count = incident_count + 1 WHERE id = $1"#,
    )
    .bind(shipment_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn load_shipment_context(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<Option<crate::incident_engine::models::ShipmentContext>, sqlx::Error> {
    let row = sqlx::query(
        r#"SELECT requires_cold_chain, origin, destination, last_checkpoint_at
           FROM shipments WHERE id = $1"#,
    )
    .bind(shipment_id)
    .fetch_optional(pool)
    .await?;

    let Some(r) = row else {
        return Ok(None);
    };

    use sqlx::Row;
    Ok(Some(crate::incident_engine::models::ShipmentContext {
        shipment_id,
        requires_cold_chain: r.try_get("requires_cold_chain")?,
        origin: r.try_get("origin")?,
        destination: r.try_get("destination")?,
        last_checkpoint_at: r.try_get("last_checkpoint_at")?,
    }))
}

pub async fn id_by_tx_hash(pool: &PgPool, tx_hash: &str) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar(r#"SELECT id FROM incidents WHERE tx_hash = $1"#)
        .bind(tx_hash)
        .fetch_optional(pool)
        .await
}

pub async fn insert_on_chain(
    pool: &PgPool,
    shipment_id: Uuid,
    incident_type: &str,
    severity: &str,
    description: &str,
    evidence_hash_hex: &str,
    created_by_wallet: &str,
    tx_hash: &str,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
        r#"INSERT INTO incidents (
               shipment_id, incident_type, severity, status, source,
               description, detected_at, evidence_hash, created_by_wallet, tx_hash
           ) VALUES ($1, $2, $3, 'Open', 'on_chain', $4, now(), $5, $6, $7)
           RETURNING id"#,
    )
    .bind(shipment_id)
    .bind(incident_type)
    .bind(severity)
    .bind(description)
    .bind(evidence_hash_hex)
    .bind(created_by_wallet)
    .bind(tx_hash)
    .fetch_one(pool)
    .await
}

#[derive(Debug, Clone)]
pub struct IncidentHubSummary {
    pub total_incidents: i64,
    pub open_incidents: i64,
    pub resolved_incidents: i64,
    pub critical_open: i64,
    pub high_open: i64,
    pub auto_detections: i64,
    pub on_chain_reports: i64,
    pub shipments_with_incidents: i64,
    pub active_monitoring: i64,
}

#[derive(Debug)]
pub struct IncidentHubRecentRow {
    pub incident: IncidentRow,
    pub shipment_product: String,
    pub shipment_status: String,
}

pub async fn summary_for_wallet(
    pool: &PgPool,
    wallet: &str,
    operational_inventory: bool,
) -> Result<IncidentHubSummary, sqlx::Error> {
    use sqlx::Row;

    let summary_row = if operational_inventory {
        sqlx::query(
            r#"SELECT
                   COUNT(*)::bigint AS total_incidents,
                   COUNT(*) FILTER (WHERE status = 'Open')::bigint AS open_incidents,
                   COUNT(*) FILTER (WHERE status = 'Resolved')::bigint AS resolved_incidents,
                   COUNT(*) FILTER (WHERE status = 'Open' AND severity = 'Critical')::bigint AS critical_open,
                   COUNT(*) FILTER (WHERE status = 'Open' AND severity = 'High')::bigint AS high_open,
                   COUNT(*) FILTER (WHERE source = 'auto')::bigint AS auto_detections,
                   COUNT(*) FILTER (WHERE source = 'on_chain')::bigint AS on_chain_reports,
                   COUNT(DISTINCT shipment_id)::bigint AS shipments_with_incidents
               FROM incidents"#,
        )
        .fetch_one(pool)
        .await?
    } else {
        sqlx::query(
            r#"SELECT
                   COUNT(*)::bigint AS total_incidents,
                   COUNT(*) FILTER (WHERE i.status = 'Open')::bigint AS open_incidents,
                   COUNT(*) FILTER (WHERE i.status = 'Resolved')::bigint AS resolved_incidents,
                   COUNT(*) FILTER (WHERE i.status = 'Open' AND i.severity = 'Critical')::bigint AS critical_open,
                   COUNT(*) FILTER (WHERE i.status = 'Open' AND i.severity = 'High')::bigint AS high_open,
                   COUNT(*) FILTER (WHERE i.source = 'auto')::bigint AS auto_detections,
                   COUNT(*) FILTER (WHERE i.source = 'on_chain')::bigint AS on_chain_reports,
                   COUNT(DISTINCT i.shipment_id)::bigint AS shipments_with_incidents
               FROM incidents i
               INNER JOIN shipments s ON s.id = i.shipment_id
               WHERE s.sender_wallet = $1 OR s.recipient_wallet = $1"#,
        )
        .bind(wallet)
        .fetch_one(pool)
        .await?
    };

    let active_monitoring: i64 = if operational_inventory {
        sqlx::query_scalar(
            r#"SELECT COUNT(*)::bigint FROM shipment_monitoring WHERE status = 'active'"#,
        )
        .fetch_one(pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"SELECT COUNT(*)::bigint
               FROM shipment_monitoring sm
               INNER JOIN shipments s ON s.id = sm.shipment_id
               WHERE sm.status = 'active'
                 AND (s.sender_wallet = $1 OR s.recipient_wallet = $1)"#,
        )
        .bind(wallet)
        .fetch_one(pool)
        .await?
    };

    Ok(IncidentHubSummary {
        total_incidents: summary_row.try_get("total_incidents")?,
        open_incidents: summary_row.try_get("open_incidents")?,
        resolved_incidents: summary_row.try_get("resolved_incidents")?,
        critical_open: summary_row.try_get("critical_open")?,
        high_open: summary_row.try_get("high_open")?,
        auto_detections: summary_row.try_get("auto_detections")?,
        on_chain_reports: summary_row.try_get("on_chain_reports")?,
        shipments_with_incidents: summary_row.try_get("shipments_with_incidents")?,
        active_monitoring,
    })
}

pub async fn recent_for_wallet(
    pool: &PgPool,
    wallet: &str,
    operational_inventory: bool,
    limit: i64,
) -> Result<Vec<IncidentHubRecentRow>, sqlx::Error> {
    let rows = if operational_inventory {
        sqlx::query(
            r#"SELECT i.id, i.shipment_id, i.incident_type, i.severity, i.status, i.source,
                      i.description, i.detected_at, i.resolved_at, i.evidence_json, i.rule_name, i.tx_hash,
                      s.product AS shipment_product, s.status AS shipment_status
               FROM incidents i
               INNER JOIN shipments s ON s.id = i.shipment_id
               ORDER BY i.detected_at DESC
               LIMIT $1"#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            r#"SELECT i.id, i.shipment_id, i.incident_type, i.severity, i.status, i.source,
                      i.description, i.detected_at, i.resolved_at, i.evidence_json, i.rule_name, i.tx_hash,
                      s.product AS shipment_product, s.status AS shipment_status
               FROM incidents i
               INNER JOIN shipments s ON s.id = i.shipment_id
               WHERE s.sender_wallet = $1 OR s.recipient_wallet = $1
               ORDER BY i.detected_at DESC
               LIMIT $2"#,
        )
        .bind(wallet)
        .bind(limit)
        .fetch_all(pool)
        .await?
    };

    rows.iter()
        .map(|row| {
            use sqlx::Row;
            Ok(IncidentHubRecentRow {
                incident: IncidentRow {
                    id: row.try_get("id")?,
                    shipment_id: row.try_get("shipment_id")?,
                    incident_type: row.try_get("incident_type")?,
                    severity: row.try_get("severity")?,
                    status: row.try_get("status")?,
                    source: row.try_get("source")?,
                    description: row.try_get("description")?,
                    detected_at: row.try_get("detected_at")?,
                    resolved_at: row.try_get("resolved_at")?,
                    evidence_json: row.try_get("evidence_json")?,
                    rule_name: row.try_get("rule_name")?,
                    tx_hash: row.try_get("tx_hash")?,
                },
                shipment_product: row.try_get("shipment_product")?,
                shipment_status: row.try_get("shipment_status")?,
            })
        })
        .collect()
}

pub async fn list_for_wallet(
    pool: &PgPool,
    wallet: &str,
    operational_inventory: bool,
) -> Result<Vec<IncidentRow>, sqlx::Error> {
    let rows = if operational_inventory {
        sqlx::query(
            r#"SELECT id, shipment_id, incident_type, severity, status, source,
                      description, detected_at, resolved_at, evidence_json, rule_name, tx_hash
               FROM incidents
               ORDER BY detected_at DESC
               LIMIT 500"#,
        )
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            r#"SELECT i.id, i.shipment_id, i.incident_type, i.severity, i.status, i.source,
                      i.description, i.detected_at, i.resolved_at, i.evidence_json, i.rule_name, i.tx_hash
               FROM incidents i
               INNER JOIN shipments s ON s.id = i.shipment_id
               WHERE s.sender_wallet = $1 OR s.recipient_wallet = $1
               ORDER BY i.detected_at DESC
               LIMIT 500"#,
        )
        .bind(wallet)
        .fetch_all(pool)
        .await?
    };

    rows.iter().map(row_from_pg).collect()
}

pub async fn get_by_id(pool: &PgPool, incident_id: Uuid) -> Result<Option<IncidentRow>, sqlx::Error> {
    let row = sqlx::query(
        r#"SELECT id, shipment_id, incident_type, severity, status, source,
                  description, detected_at, resolved_at, evidence_json, rule_name, tx_hash
           FROM incidents WHERE id = $1"#,
    )
    .bind(incident_id)
    .fetch_optional(pool)
    .await?;

    row.as_ref().map(row_from_pg).transpose()
}

pub async fn resolve_open(
    pool: &PgPool,
    incident_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"UPDATE incidents SET status = 'Resolved', resolved_at = now()
           WHERE id = $1 AND status = 'Open'"#,
    )
    .bind(incident_id)
    .execute(pool)
    .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn list_by_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<Vec<IncidentRow>, sqlx::Error> {
    let rows = sqlx::query(
        r#"SELECT id, shipment_id, incident_type, severity, status, source,
                  description, detected_at, resolved_at, evidence_json, rule_name, tx_hash
           FROM incidents WHERE shipment_id = $1 ORDER BY detected_at DESC"#,
    )
    .bind(shipment_id)
    .fetch_all(pool)
    .await?;

    rows.iter().map(row_from_pg).collect()
}

fn row_from_pg(row: &sqlx::postgres::PgRow) -> Result<IncidentRow, sqlx::Error> {
    use sqlx::Row;
    Ok(IncidentRow {
        id: row.try_get("id")?,
        shipment_id: row.try_get("shipment_id")?,
        incident_type: row.try_get("incident_type")?,
        severity: row.try_get("severity")?,
        status: row.try_get("status")?,
        source: row.try_get("source")?,
        description: row.try_get("description")?,
        detected_at: row.try_get("detected_at")?,
        resolved_at: row.try_get("resolved_at")?,
        evidence_json: row.try_get("evidence_json")?,
        rule_name: row.try_get("rule_name")?,
        tx_hash: row.try_get("tx_hash")?,
    })
}

#[derive(Debug)]
pub struct IncidentRow {
    pub id: Uuid,
    pub shipment_id: Uuid,
    pub incident_type: String,
    pub severity: String,
    pub status: String,
    pub source: String,
    pub description: String,
    pub detected_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub evidence_json: Option<sqlx::types::Json<Value>>,
    pub rule_name: Option<String>,
    pub tx_hash: Option<String>,
}
