//! On-chain `Shipment` account — layout aligned with backend `ShipmentAccountData` (PLAN §7.1).

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ShipmentStatus {
    Created,
    InTransit,
    AtHub,
    OutForDelivery,
    Delivered,
    Returned,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Default)]
pub enum ShipmentPriority {
    #[default]
    Normal,
    Urgent,
    Express,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CheckpointType {
    Pickup,
    HubIn,
    HubOut,
    Transit,
    DeliveryAttempt,
    Delivered,
    SensorData,
}

#[account]
#[derive(InitSpace)]
pub struct Shipment {
    pub id: u64,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    #[max_len(64)]
    pub product: String,
    #[max_len(128)]
    pub origin: String,
    #[max_len(128)]
    pub destination: String,
    pub status: ShipmentStatus,
    pub requires_cold_chain: bool,
    pub checkpoint_count: u32,
    pub incident_count: u32,
    pub date_created: i64,
    pub date_delivered: i64,
    /// Peso en gramos; 0 = no indicado.
    pub weight_grams: u32,
    /// Cantidad de bultos/unidades; 0 = no indicado.
    pub quantity: u32,
    #[max_len(32)]
    pub quantity_unit: String,
    /// Unix timestamp (UTC); 0 = no indicado.
    pub estimated_delivery_at: i64,
    #[max_len(64)]
    pub reference_code: String,
    pub priority: ShipmentPriority,
    #[max_len(256)]
    pub notes: String,
    /// Assigned carrier wallet; `Pubkey::default()` until the sender assigns one.
    pub carrier: Pubkey,
}

/// MVP checkpoint-driven transitions (same subset as backend `shipment_status`).
pub fn next_status_after_checkpoint(
    current: ShipmentStatus,
    cp: CheckpointType,
) -> Option<ShipmentStatus> {
    match (current, cp) {
        (ShipmentStatus::Created, CheckpointType::Pickup) => Some(ShipmentStatus::InTransit),
        (ShipmentStatus::InTransit, CheckpointType::HubIn) => Some(ShipmentStatus::AtHub),
        (ShipmentStatus::AtHub, CheckpointType::HubOut) => Some(ShipmentStatus::InTransit),
        (ShipmentStatus::InTransit, CheckpointType::Transit) => Some(ShipmentStatus::OutForDelivery),
        (ShipmentStatus::OutForDelivery, CheckpointType::Delivered) => {
            Some(ShipmentStatus::Delivered)
        }
        _ => None,
    }
}
