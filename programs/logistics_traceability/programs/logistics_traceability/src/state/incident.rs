//! On-chain critical incident types (Etapa 3 — manual report only).

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CriticalIncidentType {
    TempViolation,
    Damage,
    Delay,
    Lost,
    Unauthorized,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OnChainIncidentSeverity {
    High,
    Critical,
}
