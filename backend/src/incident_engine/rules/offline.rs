use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;

use super::IncidentRule;
use crate::incident_engine::gating;
use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};
use crate::incident_engine::repositories::telemetry;

pub struct SensorOfflineRule;

const OFFLINE_MINUTES: i64 = 10;

#[async_trait]
impl IncidentRule for SensorOfflineRule {
    fn name(&self) -> &'static str {
        "sensor_offline"
    }

    async fn evaluate_telemetry(
        &self,
        _telemetry: &TelemetryEvent,
        _shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        None
    }

    async fn evaluate_shipment(
        &self,
        _shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        None
    }
}

pub async fn evaluate_offline(
    pool: &PgPool,
    shipment: &ShipmentContext,
) -> Option<IncidentDetectionResult> {
    if !gating::allows_sensor_offline(shipment) {
        return None;
    }
    let last = telemetry::latest_recorded_at(pool, shipment.shipment_id, "temperature")
        .await
        .ok()??;
    let elapsed = Utc::now().signed_duration_since(last);
    if elapsed.num_minutes() < OFFLINE_MINUTES {
        return None;
    }
    Some(IncidentDetectionResult {
        incident_type: "SENSOR_OFFLINE".into(),
        severity: "Low".into(),
        description: format!(
            "No temperature telemetry for {} minutes",
            elapsed.num_minutes()
        ),
        evidence_json: json!({
            "last_telemetry_at": last.to_rfc3339(),
            "minutes_elapsed": elapsed.num_minutes(),
            "shipment_status": shipment.status,
            "shipment_id": shipment.shipment_id.to_string(),
        }),
        rule_name: "sensor_offline".into(),
    })
}
