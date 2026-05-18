//! Incidencias — consulta, sync (vía `handlers/sync`) y resolución off-chain.

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::{get, post, State};
use serde::Serialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::access::operational_roles_see_all_shipments;
use crate::incident_engine::repositories::incidents::{self, IncidentRow};
use crate::repos::{actors, shipments};
use crate::wallet_query::{require_wallet_form, WalletQuery};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentApiItem {
    pub id: Uuid,
    pub shipment_id: Uuid,
    pub incident_type: String,
    pub severity: String,
    pub status: String,
    pub source: String,
    pub description: String,
    pub detected_at: chrono::DateTime<chrono::Utc>,
    pub resolved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub rule_name: Option<String>,
    pub tx_hash: Option<String>,
}

fn row_to_api(r: IncidentRow) -> IncidentApiItem {
    IncidentApiItem {
        id: r.id,
        shipment_id: r.shipment_id,
        incident_type: r.incident_type,
        severity: r.severity,
        status: r.status,
        source: r.source,
        description: r.description,
        detected_at: r.detected_at,
        resolved_at: r.resolved_at,
        rule_name: r.rule_name,
        tx_hash: r.tx_hash,
    }
}

async fn wallet_may_view_incident(
    pool: &PgPool,
    incident: &IncidentRow,
    wallet: &str,
) -> Result<bool, sqlx::Error> {
    if shipments::select_shipment_detail_for_wallet(pool, incident.shipment_id, wallet)
        .await?
        .is_some()
    {
        return Ok(true);
    }
    Ok(false)
}

#[get("/incidents?<q..>")]
pub async fn list_incidents(
    pool: &State<PgPool>,
    q: WalletQuery<'_>,
) -> Result<Json<Vec<IncidentApiItem>>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let role = actors::select_role_for_wallet(pool.inner(), w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let operational = role
        .as_deref()
        .is_some_and(operational_roles_see_all_shipments);

    let rows = incidents::list_for_wallet(pool.inner(), w, operational)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;

    Ok(Json(rows.into_iter().map(row_to_api).collect()))
}

#[get("/incidents/<incident_id>?<q..>")]
pub async fn get_incident(
    pool: &State<PgPool>,
    incident_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<IncidentApiItem>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let row = incidents::get_by_id(pool.inner(), incident_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                Status::NotFound,
                Json(json!({"error": "incident not found"})),
            )
        })?;

    if !wallet_may_view_incident(pool.inner(), &row, w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
    {
        return Err((
            Status::NotFound,
            Json(json!({"error": "incident not found"})),
        ));
    }

    Ok(Json(row_to_api(row)))
}

#[get("/shipments/<shipment_id>/incidents?<q..>")]
pub async fn list_shipment_incidents(
    pool: &State<PgPool>,
    shipment_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<Vec<IncidentApiItem>>, (Status, Json<Value>)> {
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

    let rows = incidents::list_by_shipment(pool.inner(), shipment_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;

    Ok(Json(rows.into_iter().map(row_to_api).collect()))
}

#[post("/incidents/<incident_id>/resolve?<q..>")]
pub async fn resolve_incident(
    pool: &State<PgPool>,
    incident_id: Uuid,
    q: WalletQuery<'_>,
) -> Result<Json<IncidentApiItem>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let row = incidents::get_by_id(pool.inner(), incident_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                Status::NotFound,
                Json(json!({"error": "incident not found"})),
            )
        })?;

    if !wallet_may_view_incident(pool.inner(), &row, w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
    {
        return Err((
            Status::NotFound,
            Json(json!({"error": "incident not found"})),
        ));
    }

    if row.status != "Open" {
        return Err((
            Status::Conflict,
            Json(json!({"error": "incident is not open"})),
        ));
    }

    let updated = incidents::resolve_open(pool.inner(), incident_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;

    if !updated {
        return Err((
            Status::Conflict,
            Json(json!({"error": "incident could not be resolved"})),
        ));
    }

    let row = incidents::get_by_id(pool.inner(), incident_id)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?
        .expect("incident row after resolve");

    Ok(Json(row_to_api(row)))
}
