//! Simuladores IoT para envíos con monitoreo activo (lecturas dentro de rango del producto).

use chrono::Utc;
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::incident_engine::gating;
use crate::incident_engine::models::TelemetryEvent;
use crate::incident_engine::repositories::{incidents, monitoring, telemetry};
use crate::incident_engine::services::rule_engine_service::RuleEngineService;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MeterSampleReport {
    pub monitoring_active: bool,
    pub gps_recorded: bool,
    pub temperature_recorded: bool,
    pub humidity_recorded: bool,
}

fn parse_coord_field(raw: &str) -> Option<(f64, f64)> {
    let parts: Vec<&str> = raw.split(',').collect();
    if parts.len() != 2 {
        return None;
    }
    let lat = parts[0].trim().parse().ok()?;
    let lng = parts[1].trim().parse().ok()?;
    Some((lat, lng))
}

/// Punto dentro del corredor origen–destino (jitter < 2 km).
fn sample_near_route(origin: &str, destination: &str, rng: &mut impl Rng) -> Option<(f64, f64)> {
    let (o_lat, o_lng) = parse_coord_field(origin)?;
    let (d_lat, d_lng) = parse_coord_field(destination)?;
    let t = rng.gen_range(0.25..0.75);
    let mid_lat = o_lat + (d_lat - o_lat) * t;
    let mid_lng = o_lng + (d_lng - o_lng) * t;
    let jitter = 0.015_f64;
    Some((
        mid_lat + rng.gen_range(-jitter..jitter),
        mid_lng + rng.gen_range(-jitter..jitter),
    ))
}

/// Temperatura dentro del rango del producto (margen interior).
fn sample_in_range(min: f64, max: f64, rng: &mut impl Rng) -> f64 {
    let margin = ((max - min) * 0.15).clamp(0.2, 1.5);
    let lo = min + margin;
    let hi = max - margin;
    if lo >= hi {
        (min + max) / 2.0
    } else {
        rng.gen_range(lo..hi)
    }
}

fn sample_humidity_in_range(min: f64, max: f64, rng: &mut impl Rng) -> f64 {
    let margin = ((max - min) * 0.1).clamp(1.0, 5.0);
    let lo = min + margin;
    let hi = max - margin;
    if lo >= hi {
        (min + max) / 2.0
    } else {
        rng.gen_range(lo..hi)
    }
}

async fn insert_telemetry_event(
    pool: &PgPool,
    event: TelemetryEvent,
) -> Result<(), sqlx::Error> {
    telemetry::insert(pool, &event).await?;
    RuleEngineService::process_telemetry(pool, event).await
}

async fn try_record_temperature(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let Some(ctx) = incidents::load_shipment_context(pool, shipment_id).await? else {
        return Ok(false);
    };

    if !gating::allows_temperature_rules(&ctx) {
        return Ok(false);
    }

    let (min, max) = match (
        ctx.thresholds.temp_celsius_min,
        ctx.thresholds.temp_celsius_max,
    ) {
        (Some(lo), Some(hi)) => (lo, hi),
        (_, Some(hi)) if ctx.requires_cold_chain => (2.0, hi),
        (Some(lo), _) if ctx.requires_cold_chain => (lo, 8.0),
        _ => return Ok(false),
    };

    let temp = sample_in_range(min, max, &mut rand::thread_rng());

    let event = TelemetryEvent {
        shipment_id,
        telemetry_type: "temperature".into(),
        value_numeric: Some(temp),
        latitude: None,
        longitude: None,
        metadata_json: None,
        recorded_at: Utc::now(),
    };

    insert_telemetry_event(pool, event).await?;
    Ok(true)
}

async fn try_record_humidity(pool: &PgPool, shipment_id: Uuid) -> Result<bool, sqlx::Error> {
    let Some(ctx) = incidents::load_shipment_context(pool, shipment_id).await? else {
        return Ok(false);
    };

    if !gating::allows_humidity_rules(&ctx) {
        return Ok(false);
    }

    let Some(max) = ctx.thresholds.humidity_pct_max else {
        return Ok(false);
    };
    let min = ctx.thresholds.humidity_pct_min.unwrap_or(0.0);

    let humidity = sample_humidity_in_range(min, max, &mut rand::thread_rng());

    let event = TelemetryEvent {
        shipment_id,
        telemetry_type: "humidity".into(),
        value_numeric: Some(humidity),
        latitude: None,
        longitude: None,
        metadata_json: None,
        recorded_at: Utc::now(),
    };

    insert_telemetry_event(pool, event).await?;
    Ok(true)
}

async fn try_record_gps(pool: &PgPool, shipment_id: Uuid) -> Result<bool, sqlx::Error> {
    let Some(ctx) = incidents::load_shipment_context(pool, shipment_id).await? else {
        return Ok(false);
    };

    if !gating::allows_gps_rules(&ctx) {
        return Ok(false);
    }

    let Some((lat, lng)) = sample_near_route(&ctx.origin, &ctx.destination, &mut rand::thread_rng())
    else {
        return Ok(false);
    };

    let event = TelemetryEvent {
        shipment_id,
        telemetry_type: "gps".into(),
        value_numeric: None,
        latitude: Some(lat),
        longitude: Some(lng),
        metadata_json: None,
        recorded_at: Utc::now(),
    };

    insert_telemetry_event(pool, event).await?;
    Ok(true)
}

/// Ejecuta GPS, temperatura y humedad simulados al instante (sin esperar al worker).
pub async fn sample_meters_on_demand(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<MeterSampleReport, sqlx::Error> {
    let monitoring_active = monitoring::is_active(pool, shipment_id).await?;
    let gps_recorded = try_record_gps(pool, shipment_id).await?;
    let temperature_recorded = try_record_temperature(pool, shipment_id).await?;
    let humidity_recorded = try_record_humidity(pool, shipment_id).await?;
    Ok(MeterSampleReport {
        monitoring_active,
        gps_recorded,
        temperature_recorded,
        humidity_recorded,
    })
}

pub async fn simulate_temperature_for_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<(), sqlx::Error> {
    if !monitoring::is_active(pool, shipment_id).await? {
        return Ok(());
    }
    let _ = try_record_temperature(pool, shipment_id).await?;
    Ok(())
}

pub async fn simulate_humidity_for_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<(), sqlx::Error> {
    if !monitoring::is_active(pool, shipment_id).await? {
        return Ok(());
    }
    let _ = try_record_humidity(pool, shipment_id).await?;
    Ok(())
}

pub async fn simulate_gps_for_shipment(
    pool: &PgPool,
    shipment_id: Uuid,
) -> Result<(), sqlx::Error> {
    if !monitoring::is_active(pool, shipment_id).await? {
        return Ok(());
    }
    let _ = try_record_gps(pool, shipment_id).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::sample_near_route;

    #[test]
    fn sample_near_route_interpolates_origin_destination() {
        let (lat, lng) = sample_near_route("13.0,-89.0", "14.0,-88.0", &mut rand::thread_rng())
            .expect("coords");
        assert!((13.0..=14.0).contains(&lat));
        assert!((-89.0..=-88.0).contains(&lng));
    }
}
