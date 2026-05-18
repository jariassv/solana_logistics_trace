//! GET `/api/v1/actors/me` — wallet from query (Etapa 2 §8.2).

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::serde::Serialize;
use rocket::State;
use serde_json::{json, Value};
use sqlx::PgPool;

use crate::dto::wallet_display::mask_wallet;
use crate::repos::actors;
use crate::wallet_query::{require_wallet_form, WalletQuery};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipientOptionJson {
    pub wallet: String,
    pub name: String,
    pub wallet_masked: String,
    pub display_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActorMeJson {
    pub wallet: String,
    pub role: String,
    pub name: String,
    pub location: Option<String>,
    pub registration_tx_hash: String,
}

#[rocket::get("/actors/recipients")]
pub async fn list_recipients(
    pool: &State<PgPool>,
) -> Result<Json<Vec<RecipientOptionJson>>, (Status, Json<Value>)> {
    let rows = actors::list_active_recipients(pool.inner())
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    let out = rows
        .into_iter()
        .map(|(wallet, name)| {
            let wallet_masked = mask_wallet(&wallet);
            let display_label = format!("{name} — {wallet_masked}");
            RecipientOptionJson {
                wallet,
                name,
                wallet_masked,
                display_label,
            }
        })
        .collect();
    Ok(Json(out))
}

#[rocket::get("/actors/me?<q..>")]
pub async fn get_actor_me(
    pool: &State<PgPool>,
    q: WalletQuery<'_>,
) -> Result<Json<ActorMeJson>, (Status, Json<Value>)> {
    let w = require_wallet_form(&q)?;
    let row = actors::select_actor_optional(pool.inner(), w)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(json!({"error": "database error"})),
            )
        })?;
    match row {
        None => Err((
            Status::NotFound,
            Json(json!({"error": "actor not found"})),
        )),
        Some((wallet, role, name, location, reg_tx)) => Ok(Json(ActorMeJson {
            wallet,
            role,
            name,
            location,
            registration_tx_hash: reg_tx.unwrap_or_default(),
        })),
    }
}
