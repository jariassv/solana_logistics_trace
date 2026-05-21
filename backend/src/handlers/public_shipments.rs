//! Consulta pública de envíos por UUID (sin wallet).

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::State;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::shipment_api::{
    checkpoint_item_from_row, shipment_detail_json_from_row, CheckpointItemJson, ShipmentDetailJson,
};
use crate::incident_engine::repositories::incidents;
use crate::repos::actors;
use crate::repos::checkpoints;
use crate::repos::products;
use crate::repos::shipments;

#[rocket::get("/public/shipments/<shipment_id>")]
pub async fn get_public_shipment(
    pool: &State<PgPool>,
    shipment_id: Uuid,
) -> Result<Json<ShipmentDetailJson>, (Status, Json<Value>)> {
    let row = shipments::select_shipment_detail_by_id(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let Some(shipment_row) = row else {
        return Err((
            Status::NotFound,
            Json(json!({"error": "shipment not found"})),
        ));
    };
    let cp_rows = checkpoints::list_for_shipment(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let mut wallets = vec![
        shipment_row.sender_wallet.clone(),
        shipment_row.recipient_wallet.clone(),
    ];
    for r in &cp_rows {
        if !wallets.iter().any(|w| w == &r.actor_wallet) {
            wallets.push(r.actor_wallet.clone());
        }
    }
    let actor_map = actors::select_summaries_for_wallets(pool.inner(), &wallets)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let product_label = products::select_product_label(pool.inner(), &shipment_row.product)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let open_incident_count: i32 = incidents::count_open_for_shipment(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
        .try_into()
        .unwrap_or(0);
    let checkpoints_json: Vec<CheckpointItemJson> = cp_rows
        .into_iter()
        .map(|r| checkpoint_item_from_row(r, &actor_map))
        .collect();
    Ok(Json(shipment_detail_json_from_row(
        shipment_row,
        checkpoints_json,
        product_label,
        open_incident_count,
        &actor_map,
    )))
}
