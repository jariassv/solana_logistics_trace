#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::{CreateShipment, RegisterActor, ReportCriticalIncident},
    constants::{ACTOR_SEED, SHIPMENT_SEED},
    instruction::{
        CreateShipment as CreateShipmentIx, RegisterActor as RegisterActorIx,
        ReportCriticalIncident as ReportCriticalIncidentIx,
    },
    state::{
        ActorRole, CriticalIncidentType, OnChainIncidentSeverity, Shipment, ShipmentStatus,
    },
    ID,
};

use crate::common::*;

fn setup_shipment(
    program: &anchor_client::Program<&anchor_client::solana_sdk::signature::Keypair>,
    payer: &anchor_client::solana_sdk::signature::Keypair,
) -> (Pubkey, Pubkey, u64) {
    let cfg_pda = cfg_pda();
    let (sender_actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, payer.pubkey().as_ref()], &ID);

    program
        .request()
        .accounts(RegisterActor {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            actor: sender_actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "Sender".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor sender");

    let cfg = fetch_program_config(program);
    let next_id = cfg.shipments_created + 1;
    let (shipment_pda, _) =
        Pubkey::find_program_address(&[SHIPMENT_SEED, &next_id.to_le_bytes()], &ID);
    let recipient = Keypair::new().pubkey();

    program
        .request()
        .accounts(CreateShipment {
            sender: payer.pubkey(),
            sender_actor: sender_actor_pda,
            program_config: cfg_pda,
            recipient,
            shipment: shipment_pda,
            system_program: system_program::ID,
        })
        .args(crate::common::create_shipment_args(
            "vaccines",
            "13.592200,-89.827500",
            "13.440900,-89.055700",
            true,
        ))
        .send()
        .expect("create_shipment");

    (shipment_pda, sender_actor_pda, next_id)
}

#[test]
#[serial_test::serial]
fn sender_reports_critical_incident_increments_counters() {
    let payer = ephemeral_funded_payer();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let (shipment_pda, sender_actor_pda, shipment_id) = setup_shipment(&program, &payer);
    let cfg_before = fetch_program_config(&program);

    let evidence_hash = [7u8; 32];

    program
        .request()
        .accounts(ReportCriticalIncident {
            reporter: payer.pubkey(),
            reporter_actor: sender_actor_pda,
            program_config: cfg_pda(),
            shipment: shipment_pda,
        })
        .args(ReportCriticalIncidentIx {
            incident_type: CriticalIncidentType::TempViolation,
            severity: OnChainIncidentSeverity::Critical,
            evidence_hash,
            description: "Cold chain breach".to_string(),
        })
        .send()
        .expect("report_critical_incident");

    let cfg_after = fetch_program_config(&program);
    assert_eq!(
        cfg_after.incidents_reported,
        cfg_before.incidents_reported + 1
    );

    let shipment_acc = program
        .rpc()
        .get_account(&shipment_pda)
        .expect("shipment account");
    let shipment = Shipment::try_deserialize(&mut &shipment_acc.data[..]).expect("decode Shipment");
    assert_eq!(shipment.id, shipment_id);
    assert_eq!(shipment.incident_count, 1);
    assert!(shipment.status == ShipmentStatus::Created);
}

#[test]
#[serial_test::serial]
fn carrier_may_report_critical_incident() {
    let sender = ephemeral_funded_payer();
    let carrier = ephemeral_funded_payer();
    let client = client_with_payer(&sender);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let (shipment_pda, _sender_actor, _) = setup_shipment(&program, &sender);

    let cfg_pda = cfg_pda();
    let (carrier_actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, carrier.pubkey().as_ref()], &ID);

    let carrier_program = client_with_payer(&carrier).program(ID).unwrap();
    carrier_program
        .request()
        .accounts(RegisterActor {
            authority: carrier.pubkey(),
            program_config: cfg_pda,
            actor: carrier_actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Carrier,
            name: "Carrier".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor carrier");

    carrier_program
        .request()
        .accounts(ReportCriticalIncident {
            reporter: carrier.pubkey(),
            reporter_actor: carrier_actor_pda,
            program_config: cfg_pda,
            shipment: shipment_pda,
        })
        .args(ReportCriticalIncidentIx {
            incident_type: CriticalIncidentType::Delay,
            severity: OnChainIncidentSeverity::High,
            evidence_hash: [1u8; 32],
            description: "Delay".to_string(),
        })
        .send()
        .expect("carrier report_critical_incident");
}
