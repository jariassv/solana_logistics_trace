use anchor_lang::prelude::*;

use crate::{
    constants::{ACTOR_SEED, CONFIG_SEED, SHIPMENT_SEED},
    error::ErrorCode,
    events::ShipmentCreated,
    state::{Actor, ProgramConfig, Shipment, ShipmentStatus},
};

#[derive(Accounts)]
pub struct CreateShipment<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut, seeds = [ACTOR_SEED, sender.key().as_ref()], bump)]
    pub sender_actor: Account<'info, Actor>,
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,
    /// CHECK: recipient wallet recorded on-chain (no signature required at creation).
    pub recipient: UncheckedAccount<'info>,
    #[account(
        init,
        payer = sender,
        space = 8 + Shipment::INIT_SPACE,
        seeds = [SHIPMENT_SEED, &(program_config.shipments_created + 1).to_le_bytes()],
        bump
    )]
    pub shipment: Account<'info, Shipment>,
    pub system_program: Program<'info, System>,
}

pub fn process_create_shipment(
    ctx: Context<CreateShipment>,
    product: String,
    origin: String,
    destination: String,
    requires_cold_chain: bool,
) -> Result<()> {
    require!(
        ctx.accounts.recipient.key() != Pubkey::default(),
        ErrorCode::InvalidRecipient
    );
    require!(product.len() <= 64, ErrorCode::StringTooLong);
    require!(origin.len() <= 128, ErrorCode::StringTooLong);
    require!(destination.len() <= 128, ErrorCode::StringTooLong);

    let cfg = &mut ctx.accounts.program_config;
    let new_id = cfg
        .shipments_created
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;
    let now = Clock::get()?.unix_timestamp;

    let s = &mut ctx.accounts.shipment;
    s.id = new_id;
    s.sender = ctx.accounts.sender.key();
    s.recipient = ctx.accounts.recipient.key();
    s.product = product;
    s.origin = origin;
    s.destination = destination;
    s.status = ShipmentStatus::Created;
    s.requires_cold_chain = requires_cold_chain;
    s.checkpoint_count = 0;
    s.incident_count = 0;
    s.date_created = now;
    s.date_delivered = 0;

    cfg.shipments_created = new_id;

    emit!(ShipmentCreated {
        on_chain_shipment_id: new_id,
        sender: s.sender,
        recipient: s.recipient,
    });

    let actor = &mut ctx.accounts.sender_actor;
    actor.shipments_created = actor
        .shipments_created
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;

    Ok(())
}
