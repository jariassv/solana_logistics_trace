//! Validación y serialización de detalles operativos del envío (off-chain).

use chrono::{DateTime, TimeZone, Utc};
use rocket::serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const MAX_REFERENCE_LEN: usize = 64;
const MAX_UNIT_LEN: usize = 32;
const MAX_NOTES_LEN: usize = 2000;
const MIN_WEIGHT_KG: f64 = 0.001;
const MAX_WEIGHT_KG: f64 = 100_000.0;
const MIN_QUANTITY: i32 = 1;
const MAX_QUANTITY: i32 = 1_000_000;

pub const PRIORITY_NORMAL: &str = "normal";
pub const PRIORITY_URGENT: &str = "urgent";
pub const PRIORITY_EXPRESS: &str = "express";

/// Payload opcional en `POST /shipments/sync` (snake_case).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ShipmentSyncDetailsInput {
    pub weight_kg: Option<f64>,
    pub quantity: Option<i32>,
    pub quantity_unit: Option<String>,
    pub estimated_delivery_at: Option<DateTime<Utc>>,
    pub reference_code: Option<String>,
    pub priority: Option<String>,
    pub notes: Option<String>,
}

/// Valores normalizados listos para persistir.
#[derive(Debug, Clone, Default)]
pub struct ShipmentDetailsPersist {
    pub weight_kg: Option<f64>,
    pub quantity: Option<i32>,
    pub quantity_unit: Option<String>,
    pub estimated_delivery_at: Option<DateTime<Utc>>,
    pub reference_code: Option<String>,
    pub priority: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipmentDetailsJson {
    pub weight_kg: Option<f64>,
    pub quantity: Option<i32>,
    pub quantity_unit: Option<String>,
    pub estimated_delivery_at: Option<DateTime<Utc>>,
    pub reference_code: Option<String>,
    pub priority: String,
    pub notes: Option<String>,
}

impl From<&ShipmentDetailsPersist> for ShipmentDetailsJson {
    fn from(p: &ShipmentDetailsPersist) -> Self {
        ShipmentDetailsJson {
            weight_kg: p.weight_kg,
            quantity: p.quantity,
            quantity_unit: p.quantity_unit.clone(),
            estimated_delivery_at: p.estimated_delivery_at,
            reference_code: p.reference_code.clone(),
            priority: p.priority.clone(),
            notes: p.notes.clone(),
        }
    }
}

fn trim_opt(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

fn validate_priority(raw: Option<String>) -> Result<String, String> {
    let p = raw
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| PRIORITY_NORMAL.to_string());
    match p.as_str() {
        PRIORITY_NORMAL | PRIORITY_URGENT | PRIORITY_EXPRESS => Ok(p),
        _ => Err(format!(
            "priority must be one of: {PRIORITY_NORMAL}, {PRIORITY_URGENT}, {PRIORITY_EXPRESS}"
        )),
    }
}

/// Normaliza y valida detalles de sync; `None` si el cliente no envió `details`.
pub fn normalize_shipment_sync_details(
    input: Option<ShipmentSyncDetailsInput>,
) -> Result<Option<ShipmentDetailsPersist>, String> {
    let Some(raw) = input else {
        return Ok(None);
    };
    let has_any = raw.weight_kg.is_some()
        || raw.quantity.is_some()
        || raw.quantity_unit.is_some()
        || raw.estimated_delivery_at.is_some()
        || raw.reference_code.is_some()
        || raw.priority.is_some()
        || raw.notes.is_some();
    if !has_any {
        return Ok(None);
    }

    let weight_kg = match raw.weight_kg {
        None => None,
        Some(w) if w.is_finite() && w >= MIN_WEIGHT_KG && w <= MAX_WEIGHT_KG => Some(w),
        Some(_) => {
            return Err(format!(
                "weight_kg must be between {MIN_WEIGHT_KG} and {MAX_WEIGHT_KG}"
            ));
        }
    };

    let quantity = match raw.quantity {
        None => None,
        Some(q) if (MIN_QUANTITY..=MAX_QUANTITY).contains(&q) => Some(q),
        Some(_) => {
            return Err(format!(
                "quantity must be between {MIN_QUANTITY} and {MAX_QUANTITY}"
            ));
        }
    };

    let quantity_unit = trim_opt(raw.quantity_unit);
    if let Some(ref u) = quantity_unit {
        if u.len() > MAX_UNIT_LEN {
            return Err(format!("quantity_unit max length is {MAX_UNIT_LEN}"));
        }
    }

    let reference_code = trim_opt(raw.reference_code);
    if let Some(ref r) = reference_code {
        if r.len() > MAX_REFERENCE_LEN {
            return Err(format!("reference_code max length is {MAX_REFERENCE_LEN}"));
        }
    }

    let notes = trim_opt(raw.notes);
    if let Some(ref n) = notes {
        if n.len() > MAX_NOTES_LEN {
            return Err(format!("notes max length is {MAX_NOTES_LEN}"));
        }
    }

    let priority = validate_priority(raw.priority)?;

    Ok(Some(ShipmentDetailsPersist {
        weight_kg,
        quantity,
        quantity_unit,
        estimated_delivery_at: raw.estimated_delivery_at,
        reference_code,
        priority,
        notes,
    }))
}

/// Filas con columnas de detalle (opcionales en lectura).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ShipmentDetailsRow {
    pub weight_kg: Option<f64>,
    pub quantity: Option<i32>,
    pub quantity_unit: Option<String>,
    pub estimated_delivery_at: Option<DateTime<Utc>>,
    pub reference_code: Option<String>,
    pub priority: String,
    pub notes: Option<String>,
}

impl ShipmentDetailsRow {
    pub fn from_pg_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;
        let priority: String = row.try_get("priority")?;
        Ok(ShipmentDetailsRow {
            weight_kg: row.try_get("weight_kg")?,
            quantity: row.try_get("quantity")?,
            quantity_unit: row.try_get("quantity_unit")?,
            estimated_delivery_at: row.try_get("estimated_delivery_at")?,
            reference_code: row.try_get("reference_code")?,
            priority,
            notes: row.try_get("notes")?,
        })
    }

    pub fn has_displayable_fields(&self) -> bool {
        self.weight_kg.is_some()
            || self.quantity.is_some()
            || self.estimated_delivery_at.is_some()
            || self.reference_code.is_some()
            || self.notes.is_some()
            || self.priority != PRIORITY_NORMAL
    }
}

impl From<ShipmentDetailsRow> for ShipmentDetailsJson {
    fn from(r: ShipmentDetailsRow) -> Self {
        ShipmentDetailsJson {
            weight_kg: r.weight_kg,
            quantity: r.quantity,
            quantity_unit: r.quantity_unit,
            estimated_delivery_at: r.estimated_delivery_at,
            reference_code: r.reference_code,
            priority: r.priority,
            notes: r.notes,
        }
    }
}

#[must_use]
pub fn shipment_details_value(d: &ShipmentDetailsJson) -> Value {
    serde_json::to_value(d).unwrap_or_else(|_| json!({}))
}

impl ShipmentDetailsPersist {
    fn field_is_set(&self) -> bool {
        self.weight_kg.is_some()
            || self.quantity.is_some()
            || self.quantity_unit.is_some()
            || self.estimated_delivery_at.is_some()
            || self.reference_code.is_some()
            || self.notes.is_some()
            || self.priority != PRIORITY_NORMAL
    }
}

#[must_use]
pub fn priority_code_from_schema(
    p: crate::solana::borsh_accounts::ShipmentPrioritySchema,
) -> &'static str {
    use crate::solana::borsh_accounts::ShipmentPrioritySchema;
    match p {
        ShipmentPrioritySchema::Normal => PRIORITY_NORMAL,
        ShipmentPrioritySchema::Urgent => PRIORITY_URGENT,
        ShipmentPrioritySchema::Express => PRIORITY_EXPRESS,
    }
}

/// Detalles leídos de la cuenta `Shipment` on-chain.
#[must_use]
pub fn shipment_details_from_account(
    s: &crate::solana::borsh_accounts::ShipmentAccountData,
) -> ShipmentDetailsPersist {
    let weight_kg = if s.weight_grams > 0 {
        Some(s.weight_grams as f64 / 1000.0)
    } else {
        None
    };
    let quantity = if s.quantity > 0 {
        Some(s.quantity as i32)
    } else {
        None
    };
    let quantity_unit = trim_opt(Some(s.quantity_unit.clone()));
    let estimated_delivery_at = if s.estimated_delivery_at > 0 {
        Utc.timestamp_opt(s.estimated_delivery_at, 0).single()
    } else {
        None
    };
    let reference_code = trim_opt(Some(s.reference_code.clone()));
    let notes = trim_opt(Some(s.notes.clone()));
    ShipmentDetailsPersist {
        weight_kg,
        quantity,
        quantity_unit,
        estimated_delivery_at,
        reference_code,
        priority: priority_code_from_schema(s.priority).to_string(),
        notes,
    }
}

/// Prioriza valores on-chain; el cuerpo de sync rellena huecos (compatibilidad).
#[must_use]
pub fn merge_shipment_details(
    chain: ShipmentDetailsPersist,
    body: Option<ShipmentDetailsPersist>,
) -> ShipmentDetailsPersist {
    let Some(b) = body else {
        return chain;
    };
    if !chain.field_is_set() && b.field_is_set() {
        return b;
    }
    ShipmentDetailsPersist {
        weight_kg: chain.weight_kg.or(b.weight_kg),
        quantity: chain.quantity.or(b.quantity),
        quantity_unit: chain.quantity_unit.or(b.quantity_unit),
        estimated_delivery_at: chain.estimated_delivery_at.or(b.estimated_delivery_at),
        reference_code: chain.reference_code.or(b.reference_code),
        priority: if chain.priority != PRIORITY_NORMAL {
            chain.priority
        } else {
            b.priority
        },
        notes: chain.notes.or(b.notes),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solana::borsh_accounts::{
        ShipmentAccountData, ShipmentPrioritySchema, ShipmentStatusSchema,
    };

    #[test]
    fn empty_details_input_is_none() {
        assert!(normalize_shipment_sync_details(None).unwrap().is_none());
        assert!(
            normalize_shipment_sync_details(Some(ShipmentSyncDetailsInput::default()))
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn validates_weight_and_priority() {
        let ok = normalize_shipment_sync_details(Some(ShipmentSyncDetailsInput {
            weight_kg: Some(12.5),
            priority: Some("urgent".into()),
            ..Default::default()
        }))
        .unwrap()
        .unwrap();
        assert_eq!(ok.weight_kg, Some(12.5));
        assert_eq!(ok.priority, PRIORITY_URGENT);

        let err = normalize_shipment_sync_details(Some(ShipmentSyncDetailsInput {
            weight_kg: Some(0.0),
            ..Default::default()
        }))
        .unwrap_err();
        assert!(err.contains("weight_kg"));
    }

    #[test]
    fn maps_on_chain_shipment_details() {
        let s = ShipmentAccountData {
            id: 1,
            sender: [0; 32],
            recipient: [0; 32],
            product: "p".into(),
            origin: "o".into(),
            destination: "d".into(),
            status: ShipmentStatusSchema::Created,
            requires_cold_chain: false,
            checkpoint_count: 0,
            incident_count: 0,
            date_created: 0,
            date_delivered: 0,
            weight_grams: 12_500,
            quantity: 10,
            quantity_unit: "cajas".into(),
            estimated_delivery_at: 1_700_000_000,
            reference_code: "PO-1".into(),
            priority: ShipmentPrioritySchema::Urgent,
            notes: "fragil".into(),
        };
        let d = shipment_details_from_account(&s);
        assert_eq!(d.weight_kg, Some(12.5));
        assert_eq!(d.quantity, Some(10));
        assert_eq!(d.priority, PRIORITY_URGENT);
    }
}
