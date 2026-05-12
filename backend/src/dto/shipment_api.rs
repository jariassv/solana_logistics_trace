//! Public GET JSON shapes — camelCase, on-chain ids as decimal strings (PLAN §6.7, §19.2–§19.3).

use chrono::{DateTime, Utc};
use rocket::serde::Serialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::dto::coordinates::resolve_checkpoint_coordinates;
use crate::dto::metadata::checkpoint_metadata_for_api;
use crate::repos::checkpoints::CheckpointListRow;
use crate::repos::shipments::{ShipmentDetailRow, ShipmentListRow};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipmentListItemJson {
    pub shipment_id: Uuid,
    pub on_chain_shipment_id: String,
    pub status: String,
    pub product: String,
    pub created_at: DateTime<Utc>,
    pub requires_cold_chain: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointItemJson {
    pub checkpoint_id: String,
    pub on_chain_checkpoint_id: String,
    #[serde(rename = "type")]
    pub checkpoint_type: String,
    pub occurred_at: DateTime<Utc>,
    pub location: Option<String>,
    pub actor: String,
    pub temperature_centi: Option<i16>,
    pub humidity: Option<i16>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub metadata: Value,
    pub tx_hash: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipmentDetailJson {
    pub shipment_id: Uuid,
    pub on_chain_shipment_id: String,
    pub display_label: Option<String>,
    pub product: String,
    pub origin: String,
    pub destination: String,
    pub sender: String,
    pub recipient: String,
    pub status: String,
    pub requires_cold_chain: bool,
    pub created_at: DateTime<Utc>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub checkpoint_count: i32,
    pub incident_count: i32,
    pub checkpoints: Vec<CheckpointItemJson>,
    pub incidents: Vec<Value>,
}

#[must_use]
pub fn shipment_list_item_from_row(row: ShipmentListRow) -> ShipmentListItemJson {
    ShipmentListItemJson {
        shipment_id: row.id,
        on_chain_shipment_id: row.on_chain_shipment_id.to_string(),
        status: row.status,
        product: row.product,
        created_at: row.created_at,
        requires_cold_chain: row.requires_cold_chain,
    }
}

#[must_use]
pub fn checkpoint_item_from_row(row: CheckpointListRow) -> CheckpointItemJson {
    let raw_meta = row
        .metadata_json
        .as_ref()
        .map(|j| j.0.clone())
        .unwrap_or_else(|| json!({}));
    let (latitude, longitude) =
        resolve_checkpoint_coordinates(row.latitude, row.longitude, &raw_meta);
    let metadata = checkpoint_metadata_for_api(&raw_meta);
    CheckpointItemJson {
        checkpoint_id: row.id.to_string(),
        on_chain_checkpoint_id: row.on_chain_checkpoint_id.to_string(),
        checkpoint_type: row.checkpoint_type,
        occurred_at: row.occurred_at,
        location: row.location,
        actor: row.actor_wallet,
        temperature_centi: row.temperature_centi,
        humidity: row.humidity,
        latitude,
        longitude,
        metadata,
        tx_hash: row.tx_hash,
    }
}

#[must_use]
pub fn shipment_detail_json_from_row(
    row: ShipmentDetailRow,
    checkpoints: Vec<CheckpointItemJson>,
) -> ShipmentDetailJson {
    ShipmentDetailJson {
        shipment_id: row.id,
        on_chain_shipment_id: row.on_chain_shipment_id.to_string(),
        display_label: None,
        product: row.product,
        origin: row.origin,
        destination: row.destination,
        sender: row.sender_wallet,
        recipient: row.recipient_wallet,
        status: row.status,
        requires_cold_chain: row.requires_cold_chain,
        created_at: row.created_at,
        delivered_at: row.delivered_at,
        checkpoint_count: row.checkpoint_count,
        incident_count: row.incident_count,
        checkpoints,
        incidents: vec![],
    }
}
