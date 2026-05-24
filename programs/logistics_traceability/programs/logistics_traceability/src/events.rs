//! On-chain events (PLAN §19.4 — Etapa 1 minimum set).

use anchor_lang::prelude::*;

use crate::state::{ActorRole, CheckpointType, CriticalIncidentType, OnChainIncidentSeverity};

#[event]
pub struct ActorRegistered {
    pub wallet: Pubkey,
    pub role: ActorRole,
    pub name: String,
}

#[event]
pub struct ShipmentCreated {
    pub on_chain_shipment_id: u64,
    pub sender: Pubkey,
    pub recipient: Pubkey,
}

#[event]
pub struct CheckpointRecorded {
    pub on_chain_checkpoint_id: u64,
    pub shipment_id: u64,
    pub checkpoint_type: CheckpointType,
}

#[event]
pub struct ShipmentCancelled {
    pub on_chain_shipment_id: u64,
    pub cancelled_by: Pubkey,
}

#[event]
pub struct DeliveryConfirmed {
    pub on_chain_shipment_id: u64,
    pub recipient: Pubkey,
}

#[event]
pub struct CarrierAssigned {
    pub on_chain_shipment_id: u64,
    pub carrier: Pubkey,
    pub assigned_by: Pubkey,
}

#[event]
pub struct CriticalIncidentReported {
    pub on_chain_shipment_id: u64,
    pub reporter: Pubkey,
    pub incident_type: CriticalIncidentType,
    pub severity: OnChainIncidentSeverity,
    pub evidence_hash: [u8; 32],
}
