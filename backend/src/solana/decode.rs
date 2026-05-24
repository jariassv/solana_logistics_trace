use borsh::BorshDeserialize;

use crate::solana::borsh_accounts::{
    ActorAccountData, CheckpointAccountData, CheckpointTypeSchema, ShipmentAccountData,
    ShipmentStatusSchema,
};
use crate::solana::discriminators::anchor_account;
use crate::solana::SolanaSyncError;

fn decode_anchor_account_body<T: BorshDeserialize>(body: &[u8]) -> Result<T, SolanaSyncError> {
    let mut rest = body;
    let v = T::deserialize(&mut rest).map_err(|_| SolanaSyncError::AccountDecode)?;
    Ok(v)
}

fn strip_account_discriminator<'a>(
    type_name: &str,
    data: &'a [u8],
) -> Result<&'a [u8], SolanaSyncError> {
    let disc = anchor_account(type_name);
    if data.len() < 8 {
        return Err(SolanaSyncError::AccountDecode);
    }
    if data[..8] != disc {
        return Err(SolanaSyncError::AccountDecode);
    }
    Ok(&data[8..])
}

#[must_use]
pub fn decode_actor_account(data: &[u8]) -> Result<ActorAccountData, SolanaSyncError> {
    let body = strip_account_discriminator("Actor", data)?;
    decode_anchor_account_body(body)
}

#[must_use]
pub fn decode_shipment_account(data: &[u8]) -> Result<ShipmentAccountData, SolanaSyncError> {
    let body = strip_account_discriminator("Shipment", data)?;
    decode_anchor_account_body(body)
}

#[must_use]
pub fn decode_checkpoint_account(data: &[u8]) -> Result<CheckpointAccountData, SolanaSyncError> {
    let body = strip_account_discriminator("Checkpoint", data)?;
    decode_anchor_account_body(body)
}

#[must_use]
pub fn shipment_status_code(s: ShipmentStatusSchema) -> &'static str {
    match s {
        ShipmentStatusSchema::Created => "Created",
        ShipmentStatusSchema::InTransit => "InTransit",
        ShipmentStatusSchema::AtHub => "AtHub",
        ShipmentStatusSchema::OutForDelivery => "OutForDelivery",
        ShipmentStatusSchema::Delivered => "Delivered",
        ShipmentStatusSchema::Returned => "Returned",
        ShipmentStatusSchema::Cancelled => "Cancelled",
        ShipmentStatusSchema::Lost => "Lost",
    }
}

#[must_use]
pub fn checkpoint_type_code(t: CheckpointTypeSchema) -> &'static str {
    match t {
        CheckpointTypeSchema::Pickup => "Pickup",
        CheckpointTypeSchema::HubIn => "HubIn",
        CheckpointTypeSchema::HubOut => "HubOut",
        CheckpointTypeSchema::Transit => "Transit",
        CheckpointTypeSchema::DeliveryAttempt => "DeliveryAttempt",
        CheckpointTypeSchema::Delivered => "Delivered",
        CheckpointTypeSchema::SensorData => "SensorData",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solana::borsh_accounts::{ActorRoleSchema, ShipmentStatusSchema};
    #[test]
    fn decode_actor_rejects_wrong_account_discriminator() {
        let mut buf = vec![0u8; 8 + 32];
        buf[0] = 0xff;
        let err = decode_actor_account(&buf).unwrap_err();
        assert!(matches!(err, SolanaSyncError::AccountDecode));
    }

    /// Anchor `InitSpace` accounts are padded to a fixed length; `borsh::from_slice` rejects
    /// trailing bytes, but on-chain data includes those zeros after the Borsh payload.
    #[test]
    fn decode_shipment_accepts_trailing_padding() {
        let disc = anchor_account("Shipment");
        let inner = ShipmentAccountData {
            id: 1,
            sender: [2u8; 32],
            recipient: [3u8; 32],
            product: "p".into(),
            origin: "o".into(),
            destination: "d".into(),
            status: ShipmentStatusSchema::Created,
            requires_cold_chain: false,
            checkpoint_count: 0,
            incident_count: 0,
            date_created: 9,
            date_delivered: 0,
            weight_grams: 0,
            quantity: 0,
            quantity_unit: String::new(),
            estimated_delivery_at: 0,
            reference_code: String::new(),
            priority: crate::solana::borsh_accounts::ShipmentPrioritySchema::Normal,
            notes: String::new(),
            carrier: [0u8; 32],
        };
        let mut buf = disc.to_vec();
        buf.extend_from_slice(&borsh::to_vec(&inner).expect("serialize"));
        buf.extend_from_slice(&[0u8; 400]);
        let out = decode_shipment_account(&buf).expect("decode with padding");
        assert_eq!(out.id, 1);
        assert_eq!(out.product, "p");
    }

    #[test]
    fn decode_actor_accepts_trailing_padding() {
        let disc = anchor_account("Actor");
        let inner = ActorAccountData {
            wallet: [7u8; 32],
            role: ActorRoleSchema::Sender,
            name: "n".into(),
            location: None,
            is_active: true,
            shipments_created: 0,
            checkpoints_recorded: 0,
            created_at: 1,
        };
        let mut buf = disc.to_vec();
        buf.extend_from_slice(&borsh::to_vec(&inner).expect("serialize"));
        buf.extend_from_slice(&[0u8; 512]);
        let out = decode_actor_account(&buf).expect("decode with padding");
        assert_eq!(out.name, "n");
    }
}
