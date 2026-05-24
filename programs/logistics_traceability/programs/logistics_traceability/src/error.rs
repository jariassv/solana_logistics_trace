use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Name must be non-empty and at most 256 bytes")]
    InvalidActorName,
    #[msg("Location string exceeds 256 bytes")]
    LocationTooLong,
    #[msg("Invalid recipient pubkey")]
    InvalidRecipient,
    #[msg("String exceeds maximum length for this field")]
    StringTooLong,
    #[msg("Checkpoint metadata exceeds 512 bytes")]
    MetadataTooLong,
    #[msg("Only the shipment sender may cancel")]
    UnauthorizedSender,
    #[msg("Only the shipment recipient may confirm delivery")]
    UnauthorizedRecipient,
    #[msg("Shipment is already delivered or cancelled")]
    ShipmentAlreadyClosed,
    #[msg("Delivery can only be confirmed when shipment is out for delivery")]
    InvalidShipmentStatusForConfirm,
    #[msg("Only sender, recipient, or carrier may report a critical incident")]
    UnauthorizedIncidentReporter,
    #[msg("Carrier must be a registered active Carrier actor")]
    InvalidCarrier,
    #[msg("A carrier is already assigned to this shipment")]
    CarrierAlreadyAssigned,
    #[msg("Only the assigned carrier may perform this action")]
    UnauthorizedCarrier,
}
