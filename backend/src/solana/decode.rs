use crate::solana::borsh_accounts::{
    ActorAccountData, CheckpointAccountData, CheckpointTypeSchema, ShipmentAccountData,
    ShipmentStatusSchema,
};
use crate::solana::discriminators::anchor_account;
use crate::solana::SolanaSyncError;

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
    borsh::from_slice(body).map_err(|_| SolanaSyncError::AccountDecode)
}

#[must_use]
pub fn decode_shipment_account(data: &[u8]) -> Result<ShipmentAccountData, SolanaSyncError> {
    let body = strip_account_discriminator("Shipment", data)?;
    borsh::from_slice(body).map_err(|_| SolanaSyncError::AccountDecode)
}

#[must_use]
pub fn decode_checkpoint_account(data: &[u8]) -> Result<CheckpointAccountData, SolanaSyncError> {
    let body = strip_account_discriminator("Checkpoint", data)?;
    borsh::from_slice(body).map_err(|_| SolanaSyncError::AccountDecode)
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

    #[test]
    fn decode_actor_rejects_wrong_account_discriminator() {
        let mut buf = vec![0u8; 8 + 32];
        buf[0] = 0xff;
        let err = decode_actor_account(&buf).unwrap_err();
        assert!(matches!(err, SolanaSyncError::AccountDecode));
    }
}
