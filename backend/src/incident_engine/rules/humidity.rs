use async_trait::async_trait;
use serde_json::json;

use super::IncidentRule;
use crate::incident_engine::gating;
use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};

pub struct HumidityRule;

#[async_trait]
impl IncidentRule for HumidityRule {
    fn name(&self) -> &'static str {
        "humidity_limit"
    }

    async fn evaluate_telemetry(
        &self,
        telemetry: &TelemetryEvent,
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        if !gating::allows_humidity_rules(shipment) || telemetry.telemetry_type != "humidity" {
            return None;
        }
        let humidity = telemetry.value_numeric?;
        if !shipment.thresholds.humidity_out_of_range(humidity) {
            return None;
        }
        let max = shipment.thresholds.humidity_pct_max;
        let min = shipment.thresholds.humidity_pct_min;
        let description = match (min, max) {
            (Some(lo), Some(hi)) => {
                format!("Humidity {humidity}% outside range {lo}–{hi}%")
            }
            (_, Some(hi)) => format!("Humidity {humidity}% exceeds max {hi}%"),
            (Some(lo), _) => format!("Humidity {humidity}% below min {lo}%"),
            _ => format!("Humidity {humidity}% out of allowed range"),
        };
        Some(IncidentDetectionResult {
            incident_type: "HUMIDITY_OUT_OF_RANGE".into(),
            severity: "Medium".into(),
            description,
            evidence_json: json!({
                "humidity_pct": humidity,
                "humidity_pct_min": min,
                "humidity_pct_max": max,
                "product": shipment.product_code,
                "shipment_status": shipment.status,
                "shipment_id": shipment.shipment_id.to_string(),
            }),
            rule_name: self.name().into(),
        })
    }

    async fn evaluate_shipment(
        &self,
        _shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        None
    }
}
