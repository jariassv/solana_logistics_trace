use anchor_lang::prelude::*;

use crate::{
    constants::{ACTOR_SEED, CHECKPOINT_SEED, CONFIG_SEED},
    error::ErrorCode,
    events::CheckpointRecorded,
    state::{
        next_status_after_checkpoint, Actor, ActorRole, Checkpoint, CheckpointType, ProgramConfig,
        Shipment, ShipmentStatus,
    },
};

#[derive(Accounts)]
pub struct RecordCheckpoint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [ACTOR_SEED, authority.key().as_ref()], bump)]
    pub actor: Account<'info, Actor>,
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub shipment: Account<'info, Shipment>,
    #[account(
        init,
        payer = authority,
        space = 8 + Checkpoint::INIT_SPACE,
        seeds = [
            CHECKPOINT_SEED,
            shipment.key().as_ref(),
            &(program_config.checkpoints_recorded + 1).to_le_bytes()
        ],
        bump
    )]
    pub checkpoint: Account<'info, Checkpoint>,
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn process_record_checkpoint(
    ctx: Context<RecordCheckpoint>,
    checkpoint_type: CheckpointType,
    location: String,
    latitude: Option<i32>,
    longitude: Option<i32>,
    temperature: Option<i16>,
    humidity: Option<u8>,
    metadata: String,
) -> Result<()> {
    require!(location.len() <= 256, ErrorCode::StringTooLong);
    require!(metadata.len() <= 512, ErrorCode::MetadataTooLong);

    let shipment = &ctx.accounts.shipment;
    require!(
        shipment.status != ShipmentStatus::Delivered
            && shipment.status != ShipmentStatus::Cancelled,
        ErrorCode::ShipmentAlreadyClosed
    );
    if ctx.accounts.actor.role == ActorRole::Carrier {
        require!(
            shipment.carrier == ctx.accounts.authority.key()
                && shipment.carrier != Pubkey::default(),
            ErrorCode::UnauthorizedCarrier
        );
    }

    let cfg = &mut ctx.accounts.program_config;
    let new_cp_id = cfg
        .checkpoints_recorded
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;
    let now = Clock::get()?.unix_timestamp;

    let shipment = &mut ctx.accounts.shipment;

    let cp = &mut ctx.accounts.checkpoint;
    cp.id = new_cp_id;
    cp.shipment_id = shipment.id;
    cp.actor = ctx.accounts.authority.key();
    cp.checkpoint_type = checkpoint_type;
    cp.location = location;
    cp.latitude = latitude;
    cp.longitude = longitude;
    cp.temperature = temperature;
    cp.humidity = humidity;
    cp.metadata = metadata;
    cp.timestamp = now;

    emit!(CheckpointRecorded {
        on_chain_checkpoint_id: new_cp_id,
        shipment_id: shipment.id,
        checkpoint_type,
    });

    shipment.checkpoint_count = shipment
        .checkpoint_count
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;
    if let Some(next) = next_status_after_checkpoint(shipment.status, checkpoint_type) {
        let mark_delivered = next == ShipmentStatus::Delivered;
        shipment.status = next;
        if mark_delivered {
            shipment.date_delivered = now;
        }
    }

    cfg.checkpoints_recorded = new_cp_id;

    let actor = &mut ctx.accounts.actor;
    actor.checkpoints_recorded = actor
        .checkpoints_recorded
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;

    Ok(())
}
