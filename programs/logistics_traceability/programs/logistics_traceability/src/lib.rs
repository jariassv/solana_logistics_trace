pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("EgpaB2yJF7jrRa71nrpoiXMqBvzpX5jrby9Tbor7LAMC");

#[program]
pub mod logistics_traceability {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        process_initialize(ctx)
    }

    pub fn register_actor(
        ctx: Context<RegisterActor>,
        role: ActorRole,
        name: String,
        location: String,
    ) -> Result<()> {
        process_register_actor(ctx, role, name, location)
    }

    pub fn create_shipment(
        ctx: Context<CreateShipment>,
        product: String,
        origin: String,
        destination: String,
        requires_cold_chain: bool,
    ) -> Result<()> {
        process_create_shipment(ctx, product, origin, destination, requires_cold_chain)
    }

    pub fn record_checkpoint(
        ctx: Context<RecordCheckpoint>,
        checkpoint_type: CheckpointType,
        location: String,
        latitude: Option<i32>,
        longitude: Option<i32>,
        temperature: Option<i16>,
        humidity: Option<u8>,
        metadata: String,
    ) -> Result<()> {
        process_record_checkpoint(
            ctx,
            checkpoint_type,
            location,
            latitude,
            longitude,
            temperature,
            humidity,
            metadata,
        )
    }
}
