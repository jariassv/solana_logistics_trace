use anchor_lang::prelude::*;

use crate::{
    constants::{ACTOR_SEED, SHIPMENT_SEED},
    error::ErrorCode,
    events::CarrierAssigned,
    state::{Actor, ActorRole, Shipment, ShipmentStatus},
};

#[derive(Accounts)]
pub struct AssignCarrier<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        seeds = [SHIPMENT_SEED, &shipment.id.to_le_bytes()],
        bump,
        constraint = shipment.sender == sender.key() @ ErrorCode::UnauthorizedSender
    )]
    pub shipment: Account<'info, Shipment>,
    /// CHECK: carrier wallet to assign (must match `carrier_actor`).
    pub carrier: UncheckedAccount<'info>,
    #[account(
        seeds = [ACTOR_SEED, carrier.key().as_ref()],
        bump,
        constraint = carrier_actor.role == ActorRole::Carrier @ ErrorCode::InvalidCarrier,
        constraint = carrier_actor.is_active @ ErrorCode::InvalidCarrier,
    )]
    pub carrier_actor: Account<'info, Actor>,
}

pub fn process_assign_carrier(ctx: Context<AssignCarrier>) -> Result<()> {
    let carrier_key = ctx.accounts.carrier.key();
    require!(carrier_key != Pubkey::default(), ErrorCode::InvalidCarrier);

    let shipment = &mut ctx.accounts.shipment;
    require!(
        shipment.carrier == Pubkey::default(),
        ErrorCode::CarrierAlreadyAssigned
    );
    require!(
        shipment.status != ShipmentStatus::Delivered
            && shipment.status != ShipmentStatus::Cancelled,
        ErrorCode::ShipmentAlreadyClosed
    );

    shipment.carrier = carrier_key;

    emit!(CarrierAssigned {
        on_chain_shipment_id: shipment.id,
        carrier: carrier_key,
        assigned_by: ctx.accounts.sender.key(),
    });

    Ok(())
}
