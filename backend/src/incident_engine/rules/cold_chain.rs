use async_trait::async_trait;
use serde_json::json;

use super::IncidentRule;
use crate::incident_engine::gating;
use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};

pub struct ColdChainRule;

#[async_trait]
impl IncidentRule for ColdChainRule {
    fn name(&self) -> &'static str {
        "cold_chain_limit"
    }

    async fn evaluate_telemetry(
        &self,
        telemetry: &TelemetryEvent,
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        if !gating::allows_temperature_rules(shipment) || telemetry.telemetry_type != "temperature" {
            return None;
        }
        if !shipment.thresholds.has_temperature_bounds() && !shipment.requires_cold_chain {
            return None;
        }
        let temp = telemetry.value_numeric?;
        if !shipment.thresholds.temperature_out_of_range(temp) {
            return None;
        }
        let max = shipment.thresholds.temp_celsius_max;
        let min = shipment.thresholds.temp_celsius_min;
        let description = match (min, max) {
            (Some(lo), Some(hi)) => format!("Temperature {temp}°C outside range {lo}–{hi}°C"),
            (_, Some(hi)) => format!("Temperature {temp}°C exceeds max {hi}°C"),
            (Some(lo), _) => format!("Temperature {temp}°C below min {lo}°C"),
            _ => format!("Temperature {temp}°C out of allowed range"),
        };
        Some(IncidentDetectionResult {
            incident_type: "COLD_CHAIN_BROKEN".into(),
            severity: "High".into(),
            description,
            evidence_json: json!({
                "temperature": temp,
                "temp_celsius_min": min,
                "temp_celsius_max": max,
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
