use std::sync::Arc;

use sqlx::PgPool;

use super::{
    validate_signature_base58, IncidentSyncRequestBody, IncidentSyncResponse, SyncOutcome,
};
use crate::incident_engine::repositories::incidents;
use crate::repos::shipments;
use crate::solana::decode::decode_shipment_account;
use crate::solana::decode_instructions::{
    critical_incident_type_code, decode_report_critical_incident_ix, on_chain_severity_code,
};
use crate::solana::discriminators::report_critical_incident_ix;
use crate::solana::parse::{find_program_instruction, transaction_result};
use crate::solana::{SolanaRpcClient, SolanaSyncError};

pub async fn sync_incident(
    pool: &PgPool,
    rpc: &Arc<dyn SolanaRpcClient>,
    program_id: &str,
    body: &IncidentSyncRequestBody,
) -> Result<SyncOutcome<IncidentSyncResponse>, SolanaSyncError> {
    validate_signature_base58(&body.tx_hash)?;
    let commitment = body.commitment();

    let tx_json = rpc
        .get_transaction_json(&body.tx_hash, &commitment)
        .await
        .map_err(|e| SolanaSyncError::Upstream(e.0))?;

    if transaction_result(&tx_json).is_none() {
        return Err(SolanaSyncError::TxNotFound);
    }

    let (keys, data) =
        find_program_instruction(&tx_json, program_id, &report_critical_incident_ix())?;

    let args = decode_report_critical_incident_ix(&data)?;

    let shipment_pk = keys
        .get(3)
        .ok_or(SolanaSyncError::MalformedTransaction)?;
    let reporter_pk = keys
        .first()
        .ok_or(SolanaSyncError::MalformedTransaction)?;

    let raw = rpc
        .get_account_data_base64(shipment_pk, &commitment)
        .await
        .map_err(|e| SolanaSyncError::Upstream(e.0))?
        .ok_or(SolanaSyncError::AccountDecode)?;
    let shipment = decode_shipment_account(&raw)?;

    let on_chain_id_i64: i64 = shipment.id.try_into().map_err(|_| {
        SolanaSyncError::Validation("on_chain_shipment_id overflow".into())
    })?;

    let shipment_uuid = shipments::id_by_on_chain_shipment_id(pool, on_chain_id_i64)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
        .ok_or_else(|| {
            SolanaSyncError::Validation("shipment not found; sync shipment first".into())
        })?;

    if let Some(existing) = incidents::id_by_tx_hash(pool, &body.tx_hash)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    {
        return Ok(SyncOutcome {
            created: false,
            body: IncidentSyncResponse {
                incident_id: existing,
                shipment_id: shipment_uuid,
                incident_type: critical_incident_type_code(args.incident_type).to_string(),
                tx_hash: body.tx_hash.clone(),
            },
        });
    }

    if incidents::loss_incident_exists(pool, shipment_uuid)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    {
        return Err(SolanaSyncError::Validation(
            "shipment has registered loss; no further incidents allowed".into(),
        ));
    }

    let evidence_hash_hex: String = args
        .evidence_hash
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();

    let incident_type = critical_incident_type_code(args.incident_type);
    let severity = on_chain_severity_code(args.severity);

    let incident_id = if let Some(anchor_id) = body.anchor_incident_id {
        incidents::anchor_auto_to_on_chain(
            pool,
            anchor_id,
            shipment_uuid,
            incident_type,
            severity,
            &args.description,
            &evidence_hash_hex,
            reporter_pk,
            &body.tx_hash,
        )
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    } else {
        incidents::insert_on_chain(
            pool,
            shipment_uuid,
            incident_type,
            severity,
            &args.description,
            &evidence_hash_hex,
            reporter_pk,
            &body.tx_hash,
        )
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?
    };

    let incident_count_i32: i32 = shipment.incident_count.try_into().map_err(|_| {
        SolanaSyncError::Validation("incident_count overflow".into())
    })?;

    shipments::sync_incident_count(pool, shipment_uuid, incident_count_i32)
        .await
        .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;

    if incident_type == "Lost" {
        shipments::update_status(pool, shipment_uuid, "Lost")
            .await
            .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;
    } else {
        let _ = shipments::reconcile_lost_status(pool, shipment_uuid)
            .await
            .map_err(|e| SolanaSyncError::Validation(e.to_string()))?;
    }

    Ok(SyncOutcome {
        created: true,
        body: IncidentSyncResponse {
            incident_id,
            shipment_id: shipment_uuid,
            incident_type: incident_type.to_string(),
            tx_hash: body.tx_hash.clone(),
        },
    })
}
