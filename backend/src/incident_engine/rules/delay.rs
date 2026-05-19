use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

use super::IncidentRule;
use crate::incident_engine::gating;
use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};

pub struct DelayRule;

const HOURS_WITHOUT_CHECKPOINT: i64 = 2;

#[async_trait]
impl IncidentRule for DelayRule {
    fn name(&self) -> &'static str {
        "shipment_delay"
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
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        if !gating::allows_delay_rule(shipment) {
            return None;
        }
        let last = shipment.last_logistics_checkpoint_at?;
        let elapsed = Utc::now().signed_duration_since(last);
        if elapsed.num_hours() < HOURS_WITHOUT_CHECKPOINT {
            return None;
        }
        Some(IncidentDetectionResult {
            incident_type: "SHIPMENT_DELAYED".into(),
            severity: "Medium".into(),
            description: format!(
                "No logistics checkpoint for {} hours (threshold {HOURS_WITHOUT_CHECKPOINT}h)",
                elapsed.num_hours()
            ),
            evidence_json: json!({
                "last_logistics_checkpoint_at": last.to_rfc3339(),
                "hours_elapsed": elapsed.num_hours(),
                "shipment_status": shipment.status,
                "shipment_id": shipment.shipment_id.to_string(),
            }),
            rule_name: self.name().into(),
        })
    }
}
