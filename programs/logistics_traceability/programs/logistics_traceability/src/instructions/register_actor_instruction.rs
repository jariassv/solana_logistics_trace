use anchor_lang::prelude::*;

use crate::{
    constants::{ACTOR_SEED, CONFIG_SEED},
    error::ErrorCode,
    events::ActorRegistered,
    state::{Actor, ActorRole, ProgramConfig},
};

#[derive(Accounts)]
pub struct RegisterActor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(
        init,
        payer = authority,
        space = 8 + Actor::INIT_SPACE,
        seeds = [ACTOR_SEED, authority.key().as_ref()],
        bump
    )]
    pub actor: Account<'info, Actor>,
    pub system_program: Program<'info, System>,
}

pub fn process_register_actor(
    ctx: Context<RegisterActor>,
    role: ActorRole,
    name: String,
    location: String,
) -> Result<()> {
    require!(!name.is_empty() && name.len() <= 256, ErrorCode::InvalidActorName);
    let location_opt = if location.is_empty() {
        None
    } else {
        require!(location.len() <= 256, ErrorCode::LocationTooLong);
        Some(location)
    };

    let now = Clock::get()?.unix_timestamp;
    let actor = &mut ctx.accounts.actor;
    actor.wallet = ctx.accounts.authority.key();
    actor.role = role;
    actor.name = name;
    actor.location = location_opt;
    actor.is_active = true;
    actor.shipments_created = 0;
    actor.checkpoints_recorded = 0;
    actor.created_at = now;

    emit!(ActorRegistered {
        wallet: actor.wallet,
        role: actor.role,
        name: actor.name.clone(),
    });

    ctx.accounts.program_config.actors_registered = ctx
        .accounts
        .program_config
        .actors_registered
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;

    Ok(())
}
