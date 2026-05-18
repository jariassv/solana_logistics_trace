//! GET telemetría por envío (lectura off-chain).

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::{get, State};
use serde::Serialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::incident_engine::repositories::telemetry::{self, TelemetryRow};
use crate::repos::shipments;
use crate::wallet_query::{require_wallet_form, WalletQuery};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryApiItem {
    pub id: Uuid,
    pub shipment_id: Uuid,
    pub telemetry_type: String,
    pub value_numeric: Option<f64>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub recorded_at: chrono::DateTime<chrono::Utc>,
}

fn row_to_api(r: TelemetryRow) -> TelemetryApiItem {
    TelemetryApiItem {
        id: r.id,
        shipment_id: r.shipment_id,
        telemetry_type: r.telemetry_type,
        value_numeric: r.value_numeric,
        latitude: r.latitude,
        longitude: r.longitude,
        recorded_at: r.recorded_at,
    }
}

#[get("/shipments/<shipment_id>/telemetry?<q..>")]
pub async fn list_shipment_telemetry(
    pool: &State<PgPool>,
    shipment_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<Vec<TelemetryApiItem>>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    if shipments::select_shipment_detail_for_wallet(pool.inner(), shipment_id, w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
        .is_none()
    {
        return Err((
            Status::NotFound,
            Json(json!({"error": "shipment not found"})),
        ));
    }

    let rows = telemetry::list_by_shipment(pool.inner(), shipment_id, 100)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;

    Ok(Json(rows.into_iter().map(row_to_api).collect()))
}
