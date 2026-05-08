//! Anchor-style discriminators (`global:*`, `account:*`). Must match `programs/logistics_traceability`.

use sha2::{Digest, Sha256};

#[must_use]
pub fn anchor_global_ix(name: &str) -> [u8; 8] {
    let mut buf = Vec::with_capacity(7 + name.len());
    buf.extend_from_slice(b"global:");
    buf.extend_from_slice(name.as_bytes());
    Sha256::digest(&buf)[..8].try_into().expect("slice length 8")
}

#[must_use]
pub fn anchor_account(type_name: &str) -> [u8; 8] {
    let mut buf = Vec::with_capacity(8 + type_name.len());
    buf.extend_from_slice(b"account:");
    buf.extend_from_slice(type_name.as_bytes());
    Sha256::digest(&buf)[..8].try_into().expect("slice length 8")
}

#[must_use]
pub fn register_actor_ix() -> [u8; 8] {
    anchor_global_ix("register_actor")
}

#[must_use]
pub fn create_shipment_ix() -> [u8; 8] {
    anchor_global_ix("create_shipment")
}

#[must_use]
pub fn record_checkpoint_ix() -> [u8; 8] {
    anchor_global_ix("record_checkpoint")
}
