//! Borsh layouts aligned with upcoming Anchor accounts (`Etapa 1`). PLAN §7.1.

use borsh_derive::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActorRoleSchema {
    Sender,
    Carrier,
    Hub,
    Recipient,
    Inspector,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct ActorAccountData {
    pub wallet: [u8; 32],
    pub role: ActorRoleSchema,
    pub name: String,
    pub location: Option<String>,
    pub is_active: bool,
    pub shipments_created: u32,
    pub checkpoints_recorded: u32,
    pub created_at: i64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShipmentPrioritySchema {
    Normal,
    Urgent,
    Express,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShipmentStatusSchema {
    Created,
    InTransit,
    AtHub,
    OutForDelivery,
    Delivered,
    Returned,
    Cancelled,
    Lost,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct ShipmentAccountData {
    pub id: u64,
    pub sender: [u8; 32],
    pub recipient: [u8; 32],
    pub product: String,
    pub origin: String,
    pub destination: String,
    pub status: ShipmentStatusSchema,
    pub requires_cold_chain: bool,
    pub checkpoint_count: u32,
    pub incident_count: u32,
    pub date_created: i64,
    pub date_delivered: i64,
    pub weight_grams: u32,
    pub quantity: u32,
    pub quantity_unit: String,
    pub estimated_delivery_at: i64,
    pub reference_code: String,
    pub priority: ShipmentPrioritySchema,
    pub notes: String,
    pub carrier: [u8; 32],
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckpointTypeSchema {
    Pickup,
    HubIn,
    HubOut,
    Transit,
    DeliveryAttempt,
    Delivered,
    SensorData,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct CheckpointAccountData {
    pub id: u64,
    pub shipment_id: u64,
    pub actor: [u8; 32],
    pub checkpoint_type: CheckpointTypeSchema,
    pub location: String,
    pub latitude: Option<i32>,
    pub longitude: Option<i32>,
    pub temperature: Option<i16>,
    pub humidity: Option<u8>,
    pub metadata: String,
    pub timestamp: i64,
}
