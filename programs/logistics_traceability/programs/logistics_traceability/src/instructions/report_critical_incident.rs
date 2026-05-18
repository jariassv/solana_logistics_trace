use anchor_lang::prelude::*;

use crate::{
    constants::{ACTOR_SEED, CONFIG_SEED, SHIPMENT_SEED},
    error::ErrorCode,
    events::CriticalIncidentReported,
    state::{
        Actor, ActorRole, CriticalIncidentType, OnChainIncidentSeverity, ProgramConfig, Shipment,
        ShipmentStatus,
    },
};

#[derive(Accounts)]
pub struct ReportCriticalIncident<'info> {
    #[account(mut)]
    pub reporter: Signer<'info>,
    #[account(
        seeds = [ACTOR_SEED, reporter.key().as_ref()],
        bump,
    )]
    pub reporter_actor: Account<'info, Actor>,
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        seeds = [SHIPMENT_SEED, &shipment.id.to_le_bytes()],
        bump,
    )]
    pub shipment: Account<'info, Shipment>,
}

fn reporter_may_report(
    reporter: &Pubkey,
    reporter_actor: &Actor,
    shipment: &Shipment,
) -> bool {
    if *reporter == shipment.sender || *reporter == shipment.recipient {
        return true;
    }
    reporter_actor.role == ActorRole::Carrier
}

#[allow(clippy::too_many_arguments)]
pub fn process_report_critical_incident(
    ctx: Context<ReportCriticalIncident>,
    incident_type: CriticalIncidentType,
    severity: OnChainIncidentSeverity,
    evidence_hash: [u8; 32],
    description: String,
) -> Result<()> {
    require!(description.len() <= 256, ErrorCode::StringTooLong);

    let shipment = &ctx.accounts.shipment;
    require!(
        shipment.status != ShipmentStatus::Delivered
            && shipment.status != ShipmentStatus::Cancelled,
        ErrorCode::ShipmentAlreadyClosed
    );
    require!(
        reporter_may_report(
            &ctx.accounts.reporter.key(),
            &ctx.accounts.reporter_actor,
            shipment,
        ),
        ErrorCode::UnauthorizedIncidentReporter
    );

    let shipment = &mut ctx.accounts.shipment;
    shipment.incident_count = shipment
        .incident_count
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;

    let cfg = &mut ctx.accounts.program_config;
    cfg.incidents_reported = cfg
        .incidents_reported
        .checked_add(1)
        .ok_or(ErrorCode::CustomError)?;

    emit!(CriticalIncidentReported {
        on_chain_shipment_id: shipment.id,
        reporter: ctx.accounts.reporter.key(),
        incident_type,
        severity,
        evidence_hash,
    });

    let _ = description;

    Ok(())
}
