//! On-chain `Checkpoint` account — layout aligned with backend `CheckpointAccountData` (PLAN §7.1).

use anchor_lang::prelude::*;

use super::shipment::CheckpointType;

#[account]
#[derive(InitSpace)]
pub struct Checkpoint {
    pub id: u64,
    pub shipment_id: u64,
    pub actor: Pubkey,
    pub checkpoint_type: CheckpointType,
    #[max_len(256)]
    pub location: String,
    pub latitude: Option<i32>,
    pub longitude: Option<i32>,
    pub temperature: Option<i16>,
    pub humidity: Option<u8>,
    #[max_len(512)]
    pub metadata: String,
    pub timestamp: i64,
}
