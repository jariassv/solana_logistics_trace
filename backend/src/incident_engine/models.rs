//! Modelos del motor de incidencias.

use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Default)]
pub struct ProductThresholds {
    pub temp_celsius_min: Option<f64>,
    pub temp_celsius_max: Option<f64>,
    pub humidity_pct_min: Option<f64>,
    pub humidity_pct_max: Option<f64>,
}

impl ProductThresholds {
    #[must_use]
    pub fn has_temperature_bounds(&self) -> bool {
        self.temp_celsius_min.is_some() || self.temp_celsius_max.is_some()
    }

    #[must_use]
    pub fn has_humidity_bounds(&self) -> bool {
        self.humidity_pct_min.is_some() || self.humidity_pct_max.is_some()
    }

    #[must_use]
    pub fn temperature_out_of_range(&self, temp_c: f64) -> bool {
        if let Some(max) = self.temp_celsius_max {
            if temp_c > max {
                return true;
            }
        }
        if let Some(min) = self.temp_celsius_min {
            if temp_c < min {
                return true;
            }
        }
        false
    }

    #[must_use]
    pub fn humidity_out_of_range(&self, humidity_pct: f64) -> bool {
        if let Some(max) = self.humidity_pct_max {
            if humidity_pct > max {
                return true;
            }
        }
        if let Some(min) = self.humidity_pct_min {
            if humidity_pct < min {
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::ProductThresholds;

    #[test]
    fn temperature_out_of_range_respects_product_bounds() {
        let t = ProductThresholds {
            temp_celsius_min: Some(2.0),
            temp_celsius_max: Some(8.0),
            humidity_pct_min: None,
            humidity_pct_max: None,
        };
        assert!(!t.temperature_out_of_range(5.0));
        assert!(t.temperature_out_of_range(9.0));
        assert!(t.temperature_out_of_range(1.0));
    }
}

#[derive(Debug, Clone)]
pub struct TelemetryEvent {
    pub shipment_id: Uuid,
    pub telemetry_type: String,
    pub value_numeric: Option<f64>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub metadata_json: Option<Value>,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ShipmentContext {
    pub shipment_id: Uuid,
    pub status: String,
    pub product_code: String,
    pub requires_cold_chain: bool,
    pub origin: String,
    pub destination: String,
    pub has_pickup: bool,
    /// Último checkpoint logístico real (excluye SensorData de sistema).
    pub last_logistics_checkpoint_at: Option<DateTime<Utc>>,
    pub thresholds: ProductThresholds,
}

#[derive(Debug, Clone)]
pub struct IncidentDetectionResult {
    pub incident_type: String,
    pub severity: String,
    pub description: String,
    pub evidence_json: Value,
    pub rule_name: String,
}
