use anchor_lang::prelude::*;

use crate::{constants::CONFIG_SEED, state::ProgramConfig};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
}

pub fn process_initialize(ctx: Context<Initialize>) -> Result<()> {
    let cfg = &mut ctx.accounts.program_config;
    cfg.authority = ctx.accounts.authority.key();
    cfg.actors_registered = 0;
    cfg.shipments_created = 0;
    cfg.checkpoints_recorded = 0;
    cfg.incidents_reported = 0;
    Ok(())
}
