use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Name must be non-empty and at most 256 bytes")]
    InvalidActorName,
    #[msg("Location string exceeds 256 bytes")]
    LocationTooLong,
}
