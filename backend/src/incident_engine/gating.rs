//! Criterios de fase logística para reglas automáticas (post-pickup, en tránsito).

use crate::incident_engine::models::ShipmentContext;

const TERMINAL_STATUSES: &[&str] = &["Delivered", "Cancelled", "Returned"];

/// El envío ya salió de origen (pickup registrado o estado posterior a Created).
#[must_use]
pub fn logistics_started(ctx: &ShipmentContext) -> bool {
    ctx.has_pickup || ctx.status != "Created"
}

/// Monitoreo activo en tránsito (no terminal).
#[must_use]
pub fn in_transit_monitoring(ctx: &ShipmentContext) -> bool {
    logistics_started(ctx) && !TERMINAL_STATUSES.contains(&ctx.status.as_str())
}

/// Temperatura / cadena de frío: solo tras pickup y con límites de producto o frío.
#[must_use]
pub fn allows_temperature_rules(ctx: &ShipmentContext) -> bool {
    in_transit_monitoring(ctx)
        && (ctx.requires_cold_chain || ctx.thresholds.has_temperature_bounds())
}

/// GPS / desviación de ruta: en movimiento (InTransit, AtHub, OutForDelivery).
#[must_use]
pub fn allows_gps_rules(ctx: &ShipmentContext) -> bool {
    if !logistics_started(ctx) || TERMINAL_STATUSES.contains(&ctx.status.as_str()) {
        return false;
    }
    matches!(
        ctx.status.as_str(),
        "InTransit" | "AtHub" | "OutForDelivery"
    )
}

/// Retraso sin checkpoint logístico reciente.
#[must_use]
pub fn allows_delay_rule(ctx: &ShipmentContext) -> bool {
    in_transit_monitoring(ctx) && ctx.last_logistics_checkpoint_at.is_some()
}

/// Sensor sin telemetría: solo si el producto exige control térmico.
#[must_use]
pub fn allows_sensor_offline(ctx: &ShipmentContext) -> bool {
    allows_temperature_rules(ctx)
}

/// Humedad: producto con límites y fase en tránsito.
#[must_use]
pub fn allows_humidity_rules(ctx: &ShipmentContext) -> bool {
    in_transit_monitoring(ctx) && ctx.thresholds.has_humidity_bounds()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::incident_engine::models::{ProductThresholds, ShipmentContext};
    use chrono::Utc;
    use uuid::Uuid;

    fn ctx(status: &str, has_pickup: bool) -> ShipmentContext {
        ShipmentContext {
            shipment_id: Uuid::new_v4(),
            status: status.into(),
            product_code: "pharma_vaccines".into(),
            requires_cold_chain: true,
            origin: "13.5,-89.2".into(),
            destination: "13.4,-89.0".into(),
            has_pickup,
            last_logistics_checkpoint_at: if has_pickup {
                Some(Utc::now())
            } else {
                None
            },
            thresholds: ProductThresholds {
                temp_celsius_min: Some(2.0),
                temp_celsius_max: Some(8.0),
                humidity_pct_min: None,
                humidity_pct_max: None,
            },
        }
    }

    #[test]
    fn gps_blocked_before_pickup() {
        let c = ctx("Created", false);
        assert!(!allows_gps_rules(&c));
    }

    #[test]
    fn gps_allowed_in_transit_after_pickup() {
        let c = ctx("InTransit", true);
        assert!(allows_gps_rules(&c));
    }

    #[test]
    fn temperature_blocked_in_created() {
        let c = ctx("Created", false);
        assert!(!allows_temperature_rules(&c));
    }
}
