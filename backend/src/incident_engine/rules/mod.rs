//! Reglas MVP del motor de incidencias.

mod cold_chain;
mod delay;
mod humidity;
mod offline;
mod route;

use async_trait::async_trait;

use crate::incident_engine::models::{IncidentDetectionResult, ShipmentContext, TelemetryEvent};

pub use cold_chain::ColdChainRule;
pub use delay::DelayRule;
pub use humidity::HumidityRule;
pub use offline::{evaluate_offline, SensorOfflineRule};
pub use route::RouteDeviationRule;

#[async_trait]
pub trait IncidentRule: Send + Sync {
    fn name(&self) -> &'static str;
    async fn evaluate_telemetry(
        &self,
        telemetry: &TelemetryEvent,
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult>;
    async fn evaluate_shipment(
        &self,
        shipment: &ShipmentContext,
    ) -> Option<IncidentDetectionResult>;
}

pub fn all_rules() -> Vec<Box<dyn IncidentRule>> {
    vec![
        Box::new(ColdChainRule),
        Box::new(HumidityRule),
        Box::new(SensorOfflineRule),
        Box::new(RouteDeviationRule),
        Box::new(DelayRule),
    ]
}
