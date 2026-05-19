//! Persiste incidencias automáticas y checkpoints de sistema.

use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::incident_engine::models::IncidentDetectionResult;
use crate::incident_engine::repositories::incidents;

const SYSTEM_ACTOR: &str = "system@incident-engine";

pub struct IncidentProcessor;

impl IncidentProcessor {
    pub async fn apply_detection(
        pool: &PgPool,
        shipment_id: Uuid,
        detection: IncidentDetectionResult,
    ) -> Result<Option<Uuid>, sqlx::Error> {
        if incidents::open_exists(pool, shipment_id, &detection.incident_type).await? {
            return Ok(None);
        }

        let incident_id = incidents::insert_auto(
            pool,
            shipment_id,
            &detection.incident_type,
            &detection.severity,
            &detection.description,
            &detection.evidence_json,
            &detection.rule_name,
        )
        .await?;

        incidents::bump_shipment_incident_count(pool, shipment_id).await?;
        Self::insert_system_checkpoint(pool, shipment_id, incident_id, &detection).await?;

        Ok(Some(incident_id))
    }

    async fn insert_system_checkpoint(
        pool: &PgPool,
        shipment_id: Uuid,
        incident_id: Uuid,
        detection: &IncidentDetectionResult,
    ) -> Result<(), sqlx::Error> {
        let on_chain_id: i64 = sqlx::query_scalar(
            r#"SELECT COALESCE(MIN(on_chain_checkpoint_id), 0) - 1 FROM checkpoints
               WHERE shipment_id = $1"#,
        )
        .bind(shipment_id)
        .fetch_one(pool)
        .await?;

        let tx_hash = format!("system:{incident_id}");
        let meta = json!({
            "incident_id": incident_id.to_string(),
            "incident_type": detection.incident_type,
            "severity": detection.severity,
            "source": "incident_engine",
        });

        sqlx::query(
            r#"INSERT INTO checkpoints (
                   shipment_id, on_chain_checkpoint_id, actor_wallet, checkpoint_type,
                   location, metadata_json, occurred_at, tx_hash
               ) VALUES ($1, $2, $3, 'SensorData', $4, $5, $6, $7)
               ON CONFLICT (tx_hash) DO NOTHING"#,
        )
        .bind(shipment_id)
        .bind(on_chain_id)
        .bind(SYSTEM_ACTOR)
        .bind(format!("auto:{}", detection.incident_type))
        .bind(sqlx::types::Json(meta))
        .bind(Utc::now())
        .bind(&tx_hash)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"UPDATE shipments SET checkpoint_count = checkpoint_count + 1 WHERE id = $1"#,
        )
        .bind(shipment_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::*;
    use crate::incident_engine::models::IncidentDetectionResult;

    #[test]
    fn system_checkpoint_tx_hash_is_deterministic() {
        let id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        assert_eq!(
            format!("system:{id}"),
            "system:550e8400-e29b-41d4-a716-446655440000"
        );
    }

    #[test]
    fn detection_carries_rule_metadata_for_auto_incidents() {
        let detection = IncidentDetectionResult {
            incident_type: "COLD_CHAIN_BROKEN".into(),
            severity: "High".into(),
            description: "temp high".into(),
            evidence_json: json!({ "temperature": 12.0 }),
            rule_name: "cold_chain_max".into(),
        };
        assert_eq!(detection.rule_name, "cold_chain_max");
        assert_eq!(detection.incident_type, "COLD_CHAIN_BROKEN");
    }
}
