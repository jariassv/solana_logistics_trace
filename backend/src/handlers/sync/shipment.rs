use std::sync::Arc;

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::State;
use serde_json::json;
use sqlx::PgPool;

use super::map_sync_error;
use crate::config::AppConfig;
use crate::services::etapa1_sync::{sync_shipment, ShipmentSyncRequestBody};
use crate::solana::SolanaRpcClient;

#[rocket::post("/shipments/sync", format = "json", data = "<body>")]
pub async fn post_sync_shipment(
    pool: &State<PgPool>,
    rpc: &State<Arc<dyn SolanaRpcClient>>,
    cfg: &State<AppConfig>,
    body: Json<ShipmentSyncRequestBody>,
) -> Result<(Status, Json<serde_json::Value>), (Status, Json<serde_json::Value>)> {
    if cfg.program_id.is_empty() {
        return Err((
            Status::ServiceUnavailable,
            Json(json!({"error": "PROGRAM_ID is not configured"})),
        ));
    }
    match sync_shipment(pool.inner(), rpc.inner(), &cfg.program_id, &body).await {
        Ok(o) => {
            let status = if o.created {
                Status::Created
            } else {
                Status::Ok
            };
            Ok((
                status,
                Json(serde_json::to_value(o.body).unwrap_or_else(|_| json!({}))),
            ))
        }
        Err(e) => Err(map_sync_error(e)),
    }
}
