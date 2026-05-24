//! GET `/api/v1/shipments*` — Etapa 2 §8.2.

use std::collections::HashMap;

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::State;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::shipment_api::{
    checkpoint_item_from_row, shipment_detail_json_from_row, shipment_list_item_from_row,
    CheckpointItemJson, ShipmentDetailJson, ShipmentListItemJson,
};
use crate::incident_engine::repositories::incidents;
use crate::repos::actors;
use crate::repos::checkpoints;
use crate::repos::products;
use crate::repos::shipments;
use crate::wallet_query::{require_wallet_form, WalletQuery};

async fn actor_map_for_shipment(
    pool: &PgPool,
    sender: &str,
    recipient: &str,
    carrier: Option<&str>,
    cp_rows: &[crate::repos::checkpoints::CheckpointListRow],
) -> Result<HashMap<String, (String, String)>, sqlx::Error> {
    let mut wallets = vec![sender.to_string(), recipient.to_string()];
    if let Some(c) = carrier {
        wallets.push(c.to_string());
    }
    for row in cp_rows {
        if !wallets.iter().any(|w| w == &row.actor_wallet) {
            wallets.push(row.actor_wallet.clone());
        }
    }
    actors::select_summaries_for_wallets(pool, &wallets).await
}

#[rocket::get("/shipments?<q..>")]
pub async fn list_shipments(
    pool: &State<PgPool>,
    q: WalletQuery<'_>,
) -> Result<Json<Vec<ShipmentListItemJson>>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let rows = shipments::list_shipments_for_wallet(pool.inner(), w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    Ok(Json(
        rows.into_iter()
            .map(shipment_list_item_from_row)
            .collect(),
    ))
}

#[rocket::get("/shipments/<shipment_id>/checkpoints?<q..>")]
pub async fn list_shipment_checkpoints(
    pool: &State<PgPool>,
    shipment_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<Vec<CheckpointItemJson>>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let row = shipments::select_shipment_detail_for_wallet(pool.inner(), shipment_id, w)
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
    let cp_rows = checkpoints::list_for_shipment_wallet(pool.inner(), shipment_id, w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let actor_map = actor_map_for_shipment(
        pool.inner(),
        &shipment_row.sender_wallet,
        &shipment_row.recipient_wallet,
        shipment_row.carrier_wallet.as_deref(),
        &cp_rows,
    )
    .await
    .map_err(|_| {
        (
            Status::InternalServerError,
            Json(json!({"error": "database error"})),
        )
    })?;
    Ok(Json(
        cp_rows
            .into_iter()
            .map(|r| checkpoint_item_from_row(r, &actor_map))
            .collect(),
    ))
}

#[rocket::get("/shipments/<shipment_id>?<q..>")]
pub async fn get_shipment(
    pool: &State<PgPool>,
    shipment_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<ShipmentDetailJson>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    shipments::reconcile_lost_status(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let row = shipments::select_shipment_detail_for_wallet(pool.inner(), shipment_id, w)
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
    let cp_rows = checkpoints::list_for_shipment_wallet(pool.inner(), shipment_id, w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let actor_map = actor_map_for_shipment(
        pool.inner(),
        &shipment_row.sender_wallet,
        &shipment_row.recipient_wallet,
        shipment_row.carrier_wallet.as_deref(),
        &cp_rows,
    )
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
    let incident_rows = incidents::list_by_shipment(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    Ok(Json(shipment_detail_json_from_row(
        shipment_row,
        checkpoints_json,
        product_label,
        open_incident_count,
        &actor_map,
        incident_rows,
    )))
}
