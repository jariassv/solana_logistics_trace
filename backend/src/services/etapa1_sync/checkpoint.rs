use std::sync::Arc;

use chrono::{TimeZone, Utc};
use serde_json::{json, Value};
use sqlx::PgPool;

use super::{
    first_matching_account, pubkey_bs58, validate_signature_base58, CheckpointSyncResponse,
    SyncOutcome, SyncRequestBody,
};
use crate::repos::checkpoints;
use crate::services::shipment_status_transition;
use crate::solana::decode::{checkpoint_type_code, decode_checkpoint_account};
use crate::solana::discriminators::record_checkpoint_ix;
use crate::solana::parse::{
    find_program_instruction, transaction_result, transaction_slot,
};
use crate::solana::{SolanaRpcClient, SolanaSyncError};

pub async fn sync_checkpoint(
    pool: &PgPool,
    rpc: &Arc<dyn SolanaRpcClient>,
    program_id: &str,
    body: &SyncRequestBody,
) -> Result<SyncOutcome<CheckpointSyncResponse>, SolanaSyncError> {
    validate_signature_base58(&body.tx_hash)?;
    let commitment = body.commitment();

    let tx_json = rpc
        .get_transaction_json(&body.tx_hash, &commitment)
        .await
        .map_err(|e| SolanaSyncError::Upstream(e.0))?;

    if transaction_result(&tx_json).is_none() {
        return Err(SolanaSyncError::TxNotFound);
    }

    let slot = transaction_slot(&tx_json);

    let (keys, _data) =
        find_program_instruction(&tx_json, program_id, &record_checkpoint_ix())?;

    let (_, checkpoint) =
        first_matching_account(rpc, &keys, &commitment, decode_checkpoint_account).await?;

    let cp_type = checkpoint_type_code(checkpoint.checkpoint_type);

    if let Some(cid) = checkpoints::checkpoint_id_by_tx_hash(pool, &body.tx_hash)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    {
        let on_chain_shipment_i64: i64 = checkpoint.shipment_id.try_into().map_err(|_| {
            SolanaSyncError::Validation("checkpoint shipment_id overflow".into())
        })?;
        let shipment_uuid = checkpoints::shipment_db_id_by_on_chain_id(pool, on_chain_shipment_i64)
            .await
            .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
            .ok_or_else(|| {
                SolanaSyncError::Validation(
                    "shipment not found for checkpoint; sync shipment first".into(),
                )
            })?;
        return Ok(SyncOutcome {
            created: false,
            body: CheckpointSyncResponse {
                checkpoint_id: cid,
                shipment_id: shipment_uuid,
                on_chain_checkpoint_id: checkpoint.id,
                tx_hash: body.tx_hash.clone(),
            },
        });
    }

    let on_chain_shipment_i64: i64 = checkpoint.shipment_id.try_into().map_err(|_| {
        SolanaSyncError::Validation("checkpoint shipment_id overflow".into())
    })?;

    let shipment_uuid = checkpoints::shipment_db_id_by_on_chain_id(pool, on_chain_shipment_i64)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
        .ok_or_else(|| {
            SolanaSyncError::Validation("shipment not found for checkpoint; sync shipment first".into())
        })?;

    let occurred_at = Utc
        .timestamp_opt(checkpoint.timestamp, 0)
        .single()
        .unwrap_or_else(Utc::now);

    let metadata_json: Value =
        serde_json::from_str(&checkpoint.metadata).unwrap_or_else(|_| {
            json!({ "raw": checkpoint.metadata })
        });

    let latitude = checkpoint.latitude.map(|v| v as f64);
    let longitude = checkpoint.longitude.map(|v| v as f64);

    let on_chain_cp_i64: i64 = checkpoint.id.try_into().map_err(|_| {
        SolanaSyncError::Validation("on_chain_checkpoint_id overflow".into())
    })?;

    let mut txdb = pool
        .begin()
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    let row = checkpoints::insert_checkpoint(
        &mut txdb,
        shipment_uuid,
        on_chain_cp_i64,
        &pubkey_bs58(&checkpoint.actor),
        cp_type,
        &checkpoint.location,
        latitude,
        longitude,
        checkpoint.temperature,
        checkpoint.humidity.map(i16::from),
        &metadata_json,
        occurred_at,
        &body.tx_hash,
        slot,
    )
    .await
    .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    shipment_status_transition::apply_after_checkpoint_inserted(
        &mut txdb,
        shipment_uuid,
        cp_type,
        occurred_at,
    )
    .await
    .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    txdb
        .commit()
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    Ok(SyncOutcome {
        created: true,
        body: CheckpointSyncResponse {
            checkpoint_id: row,
            shipment_id: shipment_uuid,
            on_chain_checkpoint_id: checkpoint.id,
            tx_hash: body.tx_hash.clone(),
        },
    })
}
