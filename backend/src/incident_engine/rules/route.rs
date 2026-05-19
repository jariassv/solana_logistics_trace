use async_trait::async_trait;
use serde_json::json;

use super::IncidentRule;
use crate::incident_engine::gating;
use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};

pub struct RouteDeviationRule;

const MAX_DEVIATION_KM: f64 = 5.0;

fn parse_coord_field(raw: &str) -> Option<(f64, f64)> {
    let parts: Vec<&str> = raw.split(',').collect();
    if parts.len() != 2 {
        return None;
    }
    let lat = parts[0].trim().parse().ok()?;
    let lng = parts[1].trim().parse().ok()?;
    Some((lat, lng))
}

fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0_f64;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}

#[async_trait]
impl IncidentRule for RouteDeviationRule {
    fn name(&self) -> &'static str {
        "route_deviation"
    }

    async fn evaluate_telemetry(
        &self,
        telemetry: &TelemetryEvent,
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult> {
        if !gating::allows_gps_rules(shipment) || telemetry.telemetry_type != "gps" {
            return None;
        }
        let (lat, lng) = telemetry.latitude.zip(telemetry.longitude)?;
        let (o_lat, o_lng) = parse_coord_field(&shipment.origin)?;
        let (d_lat, d_lng) = parse_coord_field(&shipment.destination)?;
        let mid_lat = (o_lat + d_lat) / 2.0;
        let mid_lng = (o_lng + d_lng) / 2.0;
        let dist = haversine_km(lat, lng, mid_lat, mid_lng);
        if dist <= MAX_DEVIATION_KM {
            return None;
        }
        Some(IncidentDetectionResult {
            incident_type: "ROUTE_DEVIATION".into(),
            severity: "Medium".into(),
            description: format!("GPS {dist:.1} km from route corridor (max {MAX_DEVIATION_KM} km)"),
            evidence_json: json!({
                "latitude": lat,
                "longitude": lng,
                "deviation_km": dist,
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
