//! Public GET JSON shapes — camelCase, on-chain ids as decimal strings (PLAN §6.7, §19.2–§19.3).

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use rocket::serde::Serialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::dto::coordinates::resolve_checkpoint_coordinates;
use crate::dto::metadata::checkpoint_metadata_for_api;
use crate::dto::shipment_details::ShipmentDetailsJson;
use crate::dto::wallet_display::mask_wallet;
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
pub struct WalletParticipantJson {
    pub wallet: String,
    pub wallet_masked: String,
    pub display_name: String,
    pub role: Option<String>,
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
    pub actor_wallet_masked: String,
    pub actor_display_name: String,
    pub actor_role: Option<String>,
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
    pub creation_tx_hash: String,
    pub display_label: Option<String>,
    pub product: String,
    pub product_label: Option<String>,
    pub origin: String,
    pub destination: String,
    pub sender: String,
    pub recipient: String,
    pub sender_participant: WalletParticipantJson,
    pub recipient_participant: WalletParticipantJson,
    pub status: String,
    pub requires_cold_chain: bool,
    pub created_at: DateTime<Utc>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub checkpoint_count: i32,
    pub incident_count: i32,
    pub open_incident_count: i32,
    pub weight_kg: Option<f64>,
    pub quantity: Option<i32>,
    pub quantity_unit: Option<String>,
    pub estimated_delivery_at: Option<DateTime<Utc>>,
    pub reference_code: Option<String>,
    pub priority: String,
    pub notes: Option<String>,
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

fn actor_display_for_wallet(
    wallet: &str,
    actors: &HashMap<String, (String, String)>,
) -> (String, Option<String>) {
    if wallet.starts_with("system@") {
        return ("Motor de incidencias".into(), None);
    }
    if let Some((name, role)) = actors.get(wallet) {
        return (name.clone(), Some(role.clone()));
    }
    (mask_wallet(wallet), None)
}

#[must_use]
pub fn checkpoint_item_from_row(
    row: CheckpointListRow,
    actors: &HashMap<String, (String, String)>,
) -> CheckpointItemJson {
    let raw_meta = row
        .metadata_json
        .as_ref()
        .map(|j| j.0.clone())
        .unwrap_or_else(|| json!({}));
    let (latitude, longitude) =
        resolve_checkpoint_coordinates(row.latitude, row.longitude, &raw_meta);
    let metadata = checkpoint_metadata_for_api(&raw_meta);
    let (actor_display_name, actor_role) = actor_display_for_wallet(&row.actor_wallet, actors);
    CheckpointItemJson {
        checkpoint_id: row.id.to_string(),
        on_chain_checkpoint_id: row.on_chain_checkpoint_id.to_string(),
        checkpoint_type: row.checkpoint_type,
        occurred_at: row.occurred_at,
        location: row.location,
        actor_wallet_masked: mask_wallet(&row.actor_wallet),
        actor: row.actor_wallet,
        actor_display_name,
        actor_role,
        temperature_centi: row.temperature_centi,
        humidity: row.humidity,
        latitude,
        longitude,
        metadata,
        tx_hash: row.tx_hash,
    }
}

#[must_use]
pub fn wallet_participant_from_wallet(
    wallet: &str,
    actors: &HashMap<String, (String, String)>,
) -> WalletParticipantJson {
    let (display_name, role) = actor_display_for_wallet(wallet, actors);
    WalletParticipantJson {
        wallet: wallet.to_string(),
        wallet_masked: mask_wallet(wallet),
        display_name,
        role,
    }
}

#[must_use]
pub fn shipment_detail_json_from_row(
    row: ShipmentDetailRow,
    checkpoints: Vec<CheckpointItemJson>,
    product_label: Option<String>,
    open_incident_count: i32,
    actors: &HashMap<String, (String, String)>,
) -> ShipmentDetailJson {
    let details_json: ShipmentDetailsJson = row.details.clone().into();
    ShipmentDetailJson {
        shipment_id: row.id,
        on_chain_shipment_id: row.on_chain_shipment_id.to_string(),
        creation_tx_hash: row.creation_tx_hash,
        display_label: None,
        product: row.product.clone(),
        product_label,
        origin: row.origin,
        destination: row.destination,
        sender: row.sender_wallet.clone(),
        recipient: row.recipient_wallet.clone(),
        sender_participant: wallet_participant_from_wallet(&row.sender_wallet, actors),
        recipient_participant: wallet_participant_from_wallet(&row.recipient_wallet, actors),
        status: row.status,
        requires_cold_chain: row.requires_cold_chain,
        created_at: row.created_at,
        delivered_at: row.delivered_at,
        checkpoint_count: row.checkpoint_count,
        incident_count: row.incident_count,
        open_incident_count,
        weight_kg: details_json.weight_kg,
        quantity: details_json.quantity,
        quantity_unit: details_json.quantity_unit,
        estimated_delivery_at: details_json.estimated_delivery_at,
        reference_code: details_json.reference_code,
        priority: details_json.priority,
        notes: details_json.notes,
        checkpoints,
        incidents: vec![],
    }
}
