//! Evalúa reglas contra telemetría y contexto de envío.

use sqlx::PgPool;

use crate::incident_engine::models::{IncidentDetectionResult, TelemetryEvent};
use crate::incident_engine::processors::IncidentProcessor;
use crate::incident_engine::repositories::{incidents, rules as rule_config};
use crate::incident_engine::rules::{all_rules, evaluate_offline};
use crate::incident_engine::severity;

pub struct RuleEngineService;

impl RuleEngineService {
    pub async fn process_telemetry(
        pool: &PgPool,
        telemetry: TelemetryEvent,
    ) -> Result<(), sqlx::Error> {
        let Some(shipment) = incidents::load_shipment_context(pool, telemetry.shipment_id).await?
        else {
            return Ok(());
        };

        let severities = rule_config::active_severities_by_rule(pool).await?;
        for rule in all_rules() {
            if let Some(detection) = rule.evaluate_telemetry(&telemetry, &shipment).await {
                let detection = apply_rule_severity(detection, &severities);
                IncidentProcessor::apply_detection(pool, shipment.shipment_id, detection).await?;
            }
        }
        Ok(())
    }

    pub async fn scan_shipment(
        pool: &PgPool,
        shipment_id: uuid::Uuid,
    ) -> Result<(), sqlx::Error> {
        let Some(shipment) = incidents::load_shipment_context(pool, shipment_id).await? else {
            return Ok(());
        };

        let severities = rule_config::active_severities_by_rule(pool).await?;
        for rule in all_rules() {
            if let Some(detection) = rule.evaluate_shipment(&shipment).await {
                let detection = apply_rule_severity(detection, &severities);
                IncidentProcessor::apply_detection(pool, shipment.shipment_id, detection).await?;
            }
        }

        if let Some(detection) = evaluate_offline(pool, &shipment).await {
            let detection = apply_rule_severity(detection, &severities);
            IncidentProcessor::apply_detection(pool, shipment.shipment_id, detection).await?;
        }

        Ok(())
    }
}

fn apply_rule_severity(
    mut detection: IncidentDetectionResult,
    severities: &std::collections::HashMap<String, String>,
) -> IncidentDetectionResult {
    detection.severity = severity::resolve_for_rule(severities, &detection.rule_name);
    detection
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use uuid::Uuid;

    use crate::incident_engine::gating;
    use crate::incident_engine::models::{ProductThresholds, ShipmentContext, TelemetryEvent};
    use crate::incident_engine::rules::{ColdChainRule, HumidityRule, IncidentRule, RouteDeviationRule};

    fn in_transit_ctx() -> ShipmentContext {
        ShipmentContext {
            shipment_id: Uuid::new_v4(),
            status: "InTransit".into(),
            product_code: "pharma_vaccines".into(),
            requires_cold_chain: true,
            origin: "13.5,-89.2".into(),
            destination: "13.4,-89.0".into(),
            has_pickup: true,
            last_logistics_checkpoint_at: Some(Utc::now()),
            thresholds: ProductThresholds {
                temp_celsius_min: Some(2.0),
                temp_celsius_max: Some(8.0),
                humidity_pct_min: None,
                humidity_pct_max: None,
            },
            has_registered_loss: false,
        }
    }

    #[tokio::test]
    async fn cold_chain_triggers_when_temp_above_product_max() {
        let rule = ColdChainRule;
        let shipment = in_transit_ctx();
        let telemetry = TelemetryEvent {
            shipment_id: shipment.shipment_id,
            telemetry_type: "temperature".into(),
            value_numeric: Some(12.0),
            latitude: None,
            longitude: None,
            metadata_json: None,
            recorded_at: Utc::now(),
        };
        let detection = rule.evaluate_telemetry(&telemetry, &shipment).await;
        assert!(detection.is_some());
        assert_eq!(detection.unwrap().incident_type, "COLD_CHAIN_BROKEN");
    }

    #[tokio::test]
    async fn cold_chain_blocked_before_pickup() {
        let rule = ColdChainRule;
        let mut shipment = in_transit_ctx();
        shipment.status = "Created".into();
        shipment.has_pickup = false;
        let telemetry = TelemetryEvent {
            shipment_id: shipment.shipment_id,
            telemetry_type: "temperature".into(),
            value_numeric: Some(12.0),
            latitude: None,
            longitude: None,
            metadata_json: None,
            recorded_at: Utc::now(),
        };
        assert!(rule.evaluate_telemetry(&telemetry, &shipment).await.is_none());
    }

    #[tokio::test]
    async fn route_deviation_blocked_before_pickup() {
        let rule = RouteDeviationRule;
        let shipment = ShipmentContext {
            shipment_id: Uuid::new_v4(),
            status: "Created".into(),
            product_code: "legal_documents".into(),
            requires_cold_chain: false,
            origin: "13.5,-89.2".into(),
            destination: "13.4,-89.0".into(),
            has_pickup: false,
            last_logistics_checkpoint_at: None,
            thresholds: ProductThresholds::default(),
            has_registered_loss: false,
        };
        let telemetry = TelemetryEvent {
            shipment_id: shipment.shipment_id,
            telemetry_type: "gps".into(),
            value_numeric: None,
            latitude: Some(14.5),
            longitude: Some(-88.0),
            metadata_json: None,
            recorded_at: Utc::now(),
        };
        assert!(rule.evaluate_telemetry(&telemetry, &shipment).await.is_none());
        assert!(!gating::allows_gps_rules(&shipment));
    }

    #[tokio::test]
    async fn humidity_triggers_when_above_product_max() {
        let rule = HumidityRule;
        let shipment = ShipmentContext {
            shipment_id: Uuid::new_v4(),
            status: "InTransit".into(),
            product_code: "fresh_flowers".into(),
            requires_cold_chain: true,
            origin: "13.5,-89.2".into(),
            destination: "13.4,-89.0".into(),
            has_pickup: true,
            last_logistics_checkpoint_at: Some(Utc::now()),
            thresholds: ProductThresholds {
                temp_celsius_min: Some(2.0),
                temp_celsius_max: Some(12.0),
                humidity_pct_min: Some(70.0),
                humidity_pct_max: Some(95.0),
            },
            has_registered_loss: false,
        };
        let telemetry = TelemetryEvent {
            shipment_id: shipment.shipment_id,
            telemetry_type: "humidity".into(),
            value_numeric: Some(99.0),
            latitude: None,
            longitude: None,
            metadata_json: None,
            recorded_at: Utc::now(),
        };
        let detection = rule.evaluate_telemetry(&telemetry, &shipment).await;
        assert!(detection.is_some());
        assert_eq!(detection.unwrap().incident_type, "HUMIDITY_OUT_OF_RANGE");
    }
}
