//! Etapa 1 — sync pipeline (§8–§9). Handlers stay thin; orchestration here; SQL in `repos/`.

mod actor;
mod checkpoint;
mod incident;
mod shipment;

pub use actor::sync_actor;
pub use checkpoint::sync_checkpoint;
pub use incident::sync_incident;
pub use shipment::sync_shipment;

use std::sync::Arc;

use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::dto::shipment_details::ShipmentSyncDetailsInput;
use crate::solana::{SolanaRpcClient, SolanaSyncError};

#[derive(Debug, Deserialize)]
pub struct SyncRequestBody {
    pub tx_hash: String,
    #[serde(default)]
    pub commitment: Option<String>,
}

/// Cuerpo de `POST /shipments/sync`: transacción on-chain + detalles opcionales off-chain.
#[derive(Debug, Deserialize)]
pub struct ShipmentSyncRequestBody {
    pub tx_hash: String,
    #[serde(default)]
    pub commitment: Option<String>,
    #[serde(default)]
    pub details: Option<ShipmentSyncDetailsInput>,
}

impl ShipmentSyncRequestBody {
    pub fn commitment(&self) -> String {
        self.commitment
            .clone()
            .filter(|c| !c.is_empty())
            .unwrap_or_else(|| "confirmed".to_string())
    }
}

impl SyncRequestBody {
    pub(super) fn commitment(&self) -> String {
        self.commitment
            .clone()
            .filter(|c| !c.is_empty())
            .unwrap_or_else(|| "confirmed".to_string())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActorSyncResponse {
    pub wallet: String,
    pub role: String,
    pub name: String,
    pub location: Option<String>,
    pub registration_tx_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipmentSyncResponse {
    pub shipment_id: uuid::Uuid,
    #[serde(serialize_with = "serialize_u64_string")]
    pub on_chain_shipment_id: u64,
    pub status: String,
    pub creation_tx_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointSyncResponse {
    pub checkpoint_id: i64,
    pub shipment_id: uuid::Uuid,
    #[serde(serialize_with = "serialize_u64_string")]
    pub on_chain_checkpoint_id: u64,
    pub tx_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentSyncResponse {
    pub incident_id: uuid::Uuid,
    pub shipment_id: uuid::Uuid,
    pub incident_type: String,
    pub tx_hash: String,
}

fn serialize_u64_string<S>(v: &u64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&v.to_string())
}

pub struct SyncOutcome<T> {
    pub created: bool,
    pub body: T,
}

pub(super) fn validate_signature_base58(sig: &str) -> Result<(), SolanaSyncError> {
    let bytes = bs58::decode(sig)
        .into_vec()
        .map_err(|_| SolanaSyncError::Validation("tx_hash is not valid base58".into()))?;
    if bytes.len() != 64 {
        return Err(SolanaSyncError::Validation(
            "tx_hash must decode to a 64-byte signature".into(),
        ));
    }
    Ok(())
}

pub(super) fn pubkey_bs58(bytes: &[u8; 32]) -> String {
    bs58::encode(bytes).into_string()
}

pub(super) fn actor_role_code(
    r: crate::solana::borsh_accounts::ActorRoleSchema,
) -> &'static str {
    use crate::solana::borsh_accounts::ActorRoleSchema;
    match r {
        ActorRoleSchema::Sender => "Sender",
        ActorRoleSchema::Carrier => "Carrier",
        ActorRoleSchema::Hub => "Hub",
        ActorRoleSchema::Recipient => "Recipient",
        ActorRoleSchema::Inspector => "Inspector",
    }
}

pub(super) async fn first_matching_account<T, F>(
    rpc: &Arc<dyn SolanaRpcClient>,
    pubkeys: &[String],
    commitment: &str,
    decode: F,
) -> Result<(String, T), SolanaSyncError>
where
    F: Fn(&[u8]) -> Result<T, SolanaSyncError>,
{
    for pk in pubkeys {
        if let Some(raw) = rpc
            .get_account_data_base64(pk, commitment)
            .await
            .map_err(|e| SolanaSyncError::Upstream(e.0))?
        {
            if let Ok(decoded) = decode(&raw) {
                return Ok((pk.clone(), decoded));
            }
        }
    }
    Err(SolanaSyncError::AccountDecode)
}

pub(super) async fn load_actor_response(
    pool: &PgPool,
    wallet: &str,
    fallback_tx_hash: &str,
) -> Result<ActorSyncResponse, sqlx::Error> {
    let row = crate::repos::actors::select_actor_row(pool, wallet).await?;
    Ok(ActorSyncResponse {
        wallet: row.0,
        role: row.1,
        name: row.2,
        location: row.3,
        registration_tx_hash: row
            .4
            .unwrap_or_else(|| fallback_tx_hash.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::validate_signature_base58;
    use crate::solana::SolanaSyncError;

    #[test]
    fn validate_signature_rejects_short_base58() {
        let err = validate_signature_base58("abc").unwrap_err();
        match err {
            SolanaSyncError::Validation(m) => assert!(m.contains("64-byte")),
            _ => panic!("expected validation error"),
        }
    }
}
