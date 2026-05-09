//! On-chain `Actor` account — layout aligned with backend `ActorAccountData` (PLAN §7.1).

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ActorRole {
    Sender,
    Carrier,
    Hub,
    Recipient,
    Inspector,
}

#[account]
#[derive(InitSpace)]
pub struct Actor {
    pub wallet: Pubkey,
    pub role: ActorRole,
    #[max_len(256)]
    pub name: String,
    #[max_len(256)]
    pub location: Option<String>,
    pub is_active: bool,
    pub shipments_created: u32,
    pub checkpoints_recorded: u32,
    pub created_at: i64,
}
