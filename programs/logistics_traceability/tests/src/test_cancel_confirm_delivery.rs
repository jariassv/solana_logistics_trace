#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::{
        CancelShipment, ConfirmDelivery, CreateShipment, RecordCheckpoint, RegisterActor,
    },
    constants::{ACTOR_SEED, CHECKPOINT_SEED, SHIPMENT_SEED},
    instruction::{
        CancelShipment as CancelShipmentIx, ConfirmDelivery as ConfirmDeliveryIx,
        CreateShipment as CreateShipmentIx, RecordCheckpoint as RecordCheckpointIx,
        RegisterActor as RegisterActorIx,
    },
    state::{ActorRole, CheckpointType, Shipment, ShipmentStatus},
    ID,
};

use crate::common::*;

fn shipment_pda(ship_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[SHIPMENT_SEED, &ship_id.to_le_bytes()], &ID).0
}

fn checkpoint_pda(shipment_key: &Pubkey, seq: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[
            CHECKPOINT_SEED,
            shipment_key.as_ref(),
            &seq.to_le_bytes(),
        ],
        &ID,
    )
    .0
}

/// Pickup → HubIn → HubOut → Transit → `OutForDelivery`.
fn advance_to_out_for_delivery(
    program: &anchor_client::Program<&Keypair>,
    sender: &Keypair,
    sender_actor: Pubkey,
    cfg: Pubkey,
    shipment_key: Pubkey,
) {
    let mut seq = fetch_program_config(program).checkpoints_recorded + 1;
    for (cp_type, loc) in [
        (CheckpointType::Pickup, "pickup"),
        (CheckpointType::HubIn, "hub-in"),
        (CheckpointType::HubOut, "hub-out"),
        (CheckpointType::Transit, "transit"),
    ] {
        let cp_k = checkpoint_pda(&shipment_key, seq);
        program
            .request()
            .accounts(RecordCheckpoint {
                authority: sender.pubkey(),
                actor: sender_actor,
                program_config: cfg,
                shipment: shipment_key,
                checkpoint: cp_k,
                system_program: system_program::ID,
            })
            .args(RecordCheckpointIx {
                checkpoint_type: cp_type,
                location: loc.to_string(),
                latitude: None,
                longitude: None,
                temperature: None,
                humidity: None,
                metadata: String::new(),
            })
            .signer(sender)
            .send()
            .expect("record_checkpoint chain");
        seq += 1;
    }
}

#[test]
#[serial_test::serial]
fn cancel_shipment_by_sender_sets_cancelled() {
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
    let ship_id = fetch_program_config(&program).shipments_created + 1;
    let ship_k = shipment_pda(ship_id);

    program
        .request()
        .accounts(CreateShipment {
            sender: payer.pubkey(),
            sender_actor: sender_actor_pda,
            program_config: cfg_pda,
            recipient,
            shipment: ship_k,
            system_program: system_program::ID,
        })
        .args(crate::common::simple_create_shipment_args("p", "a", "b"))
        .send()
        .expect("create_shipment");

    program
        .request()
        .accounts(CancelShipment {
            sender: payer.pubkey(),
            shipment: ship_k,
        })
        .args(CancelShipmentIx {})
        .send()
        .expect("cancel_shipment");

    let acc = program.rpc().get_account(&ship_k).expect("shipment");
    let mut data: &[u8] = acc.data.as_slice();
    let s = Shipment::try_deserialize(&mut data).unwrap();
    assert!(matches!(s.status, ShipmentStatus::Cancelled));
}

#[test]
#[serial_test::serial]
fn confirm_delivery_by_recipient_when_out_for_delivery() {
    let sender = ephemeral_funded_payer();
    let recipient = ephemeral_funded_payer();

    let sender_client = client_with_payer(&sender);
    let program_sender = sender_client.program(ID).unwrap();
    initialize_if_needed(&program_sender);

    let cfg_pda = cfg_pda();
    let (sender_actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, sender.pubkey().as_ref()], &ID);

    program_sender
        .request()
        .accounts(RegisterActor {
            authority: sender.pubkey(),
            program_config: cfg_pda,
            actor: sender_actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "S".to_string(),
            location: String::new(),
        })
        .signer(&sender)
        .send()
        .expect("register_actor");

    let ship_id = fetch_program_config(&program_sender).shipments_created + 1;
    let ship_k = shipment_pda(ship_id);

    program_sender
        .request()
        .accounts(CreateShipment {
            sender: sender.pubkey(),
            sender_actor: sender_actor_pda,
            program_config: cfg_pda,
            recipient: recipient.pubkey(),
            shipment: ship_k,
            system_program: system_program::ID,
        })
        .args(crate::common::simple_create_shipment_args("p", "a", "b"))
        .signer(&sender)
        .send()
        .expect("create_shipment");

    advance_to_out_for_delivery(
        &program_sender,
        &sender,
        sender_actor_pda,
        cfg_pda,
        ship_k,
    );

    let recipient_client = client_with_payer(&recipient);
    let program_recipient = recipient_client.program(ID).unwrap();

    program_recipient
        .request()
        .accounts(ConfirmDelivery {
            recipient: recipient.pubkey(),
            shipment: ship_k,
        })
        .args(ConfirmDeliveryIx {})
        .signer(&recipient)
        .send()
        .expect("confirm_delivery");

    let acc = program_recipient.rpc().get_account(&ship_k).expect("shipment");
    let mut data: &[u8] = acc.data.as_slice();
    let s = Shipment::try_deserialize(&mut data).unwrap();
    assert!(matches!(s.status, ShipmentStatus::Delivered));
    assert!(s.date_delivered > 0);
}

#[test]
#[serial_test::serial]
fn confirm_delivery_fails_when_not_out_for_delivery() {
    let sender = ephemeral_funded_payer();
    let recipient = ephemeral_funded_payer();
    let sender_client = client_with_payer(&sender);
    let program_sender = sender_client.program(ID).unwrap();
    initialize_if_needed(&program_sender);
    let cfg_pda = cfg_pda();
    let (sender_actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, sender.pubkey().as_ref()], &ID);

    program_sender
        .request()
        .accounts(RegisterActor {
            authority: sender.pubkey(),
            program_config: cfg_pda,
            actor: sender_actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "S".to_string(),
            location: String::new(),
        })
        .signer(&sender)
        .send()
        .expect("register_actor");

    let ship_id = fetch_program_config(&program_sender).shipments_created + 1;
    let ship_k = shipment_pda(ship_id);

    program_sender
        .request()
        .accounts(CreateShipment {
            sender: sender.pubkey(),
            sender_actor: sender_actor_pda,
            program_config: cfg_pda,
            recipient: recipient.pubkey(),
            shipment: ship_k,
            system_program: system_program::ID,
        })
        .args(crate::common::simple_create_shipment_args("p", "a", "b"))
        .signer(&sender)
        .send()
        .expect("create_shipment");

    // Only Pickup → InTransit, not OutForDelivery
    let seq = fetch_program_config(&program_sender).checkpoints_recorded + 1;
    let cp_k = checkpoint_pda(&ship_k, seq);
    program_sender
        .request()
        .accounts(RecordCheckpoint {
            authority: sender.pubkey(),
            actor: sender_actor_pda,
            program_config: cfg_pda,
            shipment: ship_k,
            checkpoint: cp_k,
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
        .signer(&sender)
        .send()
        .expect("pickup");

    let recipient_client = client_with_payer(&recipient);
    let program_recipient = recipient_client.program(ID).unwrap();

    let err = program_recipient
        .request()
        .accounts(ConfirmDelivery {
            recipient: recipient.pubkey(),
            shipment: ship_k,
        })
        .args(ConfirmDeliveryIx {})
        .signer(&recipient)
        .send()
        .err()
        .expect("confirm should fail");
    let msg = format!("{err:?}");
    assert!(
        msg.contains("InvalidShipmentStatusForConfirm") || msg.contains("6009"),
        "unexpected error: {msg}"
    );
}
