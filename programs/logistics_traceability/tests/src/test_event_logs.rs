#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};

use logistics_traceability::{
    accounts::{CreateShipment, RecordCheckpoint, RegisterActor},
    constants::{ACTOR_SEED, CHECKPOINT_SEED, SHIPMENT_SEED},
    instruction::{
        CreateShipment as CreateShipmentIx, RecordCheckpoint as RecordCheckpointIx,
        RegisterActor as RegisterActorIx,
    },
    events::{ActorRegistered, CheckpointRecorded, ShipmentCreated},
    state::{ActorRole, CheckpointType},
    ID,
};

use crate::common::*;

#[test]
#[serial_test::serial]
fn actor_registered_event_discriminator_in_transaction_logs() {
    let payer = ephemeral_funded_payer();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let cfg_pda = cfg_pda();
    let (actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, payer.pubkey().as_ref()], &ID);

    let sig = program
        .request()
        .accounts(RegisterActor {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            actor: actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "Event Sender".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor");

    let logs = rpc_transaction_logs(&program, &sig);
    assert!(
        logs_contain_anchor_event::<ActorRegistered>(&logs),
        "expected ActorRegistered in logs: {logs:?}"
    );
}

#[test]
#[serial_test::serial]
fn shipment_created_event_discriminator_in_transaction_logs() {
    let payer = ephemeral_funded_payer();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

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
            name: "S".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor");

    let cfg_mid = fetch_program_config(&program);
    let sid = cfg_mid.shipments_created + 1;
    let (shipment_pda, _) = Pubkey::find_program_address(&[SHIPMENT_SEED, &sid.to_le_bytes()], &ID);

    let sig = program
        .request()
        .accounts(CreateShipment {
            sender: payer.pubkey(),
            sender_actor: sender_actor_pda,
            program_config: cfg_pda,
            recipient: Keypair::new().pubkey(),
            shipment: shipment_pda,
            system_program: system_program::ID,
        })
        .args(crate::common::simple_create_shipment_args("p", "o", "d"))
        .send()
        .expect("create_shipment");

    let logs = rpc_transaction_logs(&program, &sig);
    assert!(
        logs_contain_anchor_event::<ShipmentCreated>(&logs),
        "expected ShipmentCreated in logs: {logs:?}"
    );
}

#[test]
#[serial_test::serial]
fn checkpoint_recorded_event_discriminator_in_transaction_logs() {
    let payer = ephemeral_funded_payer();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

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
            name: "S".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor");

    let recipient = Keypair::new().pubkey();
    let cfg0 = fetch_program_config(&program);
    let sid = cfg0.shipments_created + 1;
    let (shipment_pda, _) = Pubkey::find_program_address(&[SHIPMENT_SEED, &sid.to_le_bytes()], &ID);

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
        .args(crate::common::simple_create_shipment_args("p", "o", "d"))
        .send()
        .expect("create_shipment");

    let cfg1 = fetch_program_config(&program);
    let next_cp = cfg1.checkpoints_recorded + 1;
    let (checkpoint_pda, _) = Pubkey::find_program_address(
        &[
            CHECKPOINT_SEED,
            shipment_pda.as_ref(),
            &next_cp.to_le_bytes(),
        ],
        &ID,
    );

    let sig = program
        .request()
        .accounts(RecordCheckpoint {
            authority: payer.pubkey(),
            actor: sender_actor_pda,
            program_config: cfg_pda,
            shipment: shipment_pda,
            checkpoint: checkpoint_pda,
            system_program: system_program::ID,
        })
        .args(RecordCheckpointIx {
            checkpoint_type: CheckpointType::Pickup,
            location: "x".to_string(),
            latitude: None,
            longitude: None,
            temperature: None,
            humidity: None,
            metadata: String::new(),
        })
        .send()
        .expect("record_checkpoint");

    let logs = rpc_transaction_logs(&program, &sig);
    assert!(
        logs_contain_anchor_event::<CheckpointRecorded>(&logs),
        "expected CheckpointRecorded in logs: {logs:?}"
    );
}
