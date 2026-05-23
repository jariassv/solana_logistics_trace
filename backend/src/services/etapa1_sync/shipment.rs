use std::sync::Arc;

use chrono::{TimeZone, Utc};
use sqlx::PgPool;

use super::{
    first_matching_account, pubkey_bs58, validate_signature_base58, ShipmentSyncRequestBody,
    ShipmentSyncResponse, SyncOutcome,
};
use crate::dto::shipment_details::normalize_shipment_sync_details;
use crate::incident_engine::MonitoringService;
use crate::repos::shipments;
use crate::solana::decode::{decode_shipment_account, shipment_status_code};
use crate::solana::discriminators::create_shipment_ix;
use crate::solana::parse::{find_program_instruction, transaction_result};
use crate::solana::{SolanaRpcClient, SolanaSyncError};

pub async fn sync_shipment(
    pool: &PgPool,
    rpc: &Arc<dyn SolanaRpcClient>,
    program_id: &str,
    body: &ShipmentSyncRequestBody,
) -> Result<SyncOutcome<ShipmentSyncResponse>, SolanaSyncError> {
    validate_signature_base58(&body.tx_hash)?;
    let commitment = body.commitment();
    let details = normalize_shipment_sync_details(body.details.clone())
        .map_err(SolanaSyncError::Validation)?;

    let tx_json = rpc
        .get_transaction_json(&body.tx_hash, &commitment)
        .await
        .map_err(|e| SolanaSyncError::Upstream(e.0))?;

    if transaction_result(&tx_json).is_none() {
        return Err(SolanaSyncError::TxNotFound);
    }

    let (keys, _data) =
        find_program_instruction(&tx_json, program_id, &create_shipment_ix())?;

    let (_, shipment) =
        first_matching_account(rpc, &keys, &commitment, decode_shipment_account).await?;

    let status = shipment_status_code(shipment.status);

    if let Some(id) = shipments::id_by_creation_tx_hash(pool, &body.tx_hash)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    {
        return Ok(SyncOutcome {
            created: false,
            body: ShipmentSyncResponse {
                shipment_id: id,
                on_chain_shipment_id: shipment.id,
                status: status.to_string(),
                creation_tx_hash: body.tx_hash.clone(),
            },
        });
    }

    let created_at = Utc
        .timestamp_opt(shipment.date_created, 0)
        .single()
        .unwrap_or_else(Utc::now);

    let delivered_at = if shipment.date_delivered > 0 {
        Utc.timestamp_opt(shipment.date_delivered, 0).single()
    } else {
        None
    };

    let on_chain_id_i64: i64 = shipment.id.try_into().map_err(|_| {
        SolanaSyncError::Validation("on_chain_shipment_id overflow".into())
    })?;

    let row = shipments::insert_shipment_returning_id(
        pool,
        on_chain_id_i64,
        &pubkey_bs58(&shipment.sender),
        &pubkey_bs58(&shipment.recipient),
        &shipment.product,
        &shipment.origin,
        &shipment.destination,
        status,
        shipment.requires_cold_chain,
        shipment.checkpoint_count as i32,
        shipment.incident_count as i32,
        created_at,
        delivered_at,
        &body.tx_hash,
        details.as_ref(),
    )
    .await
    .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    if let Err(e) = MonitoringService::start(pool, row).await {
        eprintln!("incident_engine: failed to start monitoring for {row}: {e}");
    }

    Ok(SyncOutcome {
        created: true,
        body: ShipmentSyncResponse {
            shipment_id: row,
            on_chain_shipment_id: shipment.id,
            status: status.to_string(),
            creation_tx_hash: body.tx_hash.clone(),
        },
    })
}
