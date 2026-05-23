#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::{CreateShipment, RecordCheckpoint, RegisterActor},
    constants::{ACTOR_SEED, CHECKPOINT_SEED, SHIPMENT_SEED},
    instruction::{
        CreateShipment as CreateShipmentIx, RecordCheckpoint as RecordCheckpointIx,
        RegisterActor as RegisterActorIx,
    },
    state::{
        Actor, Checkpoint, CheckpointType, Shipment,
        ActorRole,
    },
    ID,
};

use crate::common::*;

#[test]
#[serial_test::serial]
fn record_checkpoint_increments_shipment_checkpoint_count() {
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
            name: "Sender".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor");

    let recipient = Keypair::new().pubkey();
    let cfg_mid = fetch_program_config(&program);
    let ship_id = cfg_mid.shipments_created + 1;
    let (shipment_pda, _) =
        Pubkey::find_program_address(&[SHIPMENT_SEED, &ship_id.to_le_bytes()], &ID);

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
        .args(crate::common::simple_create_shipment_args("SKU-trace", "A", "B"))
        .send()
        .expect("create_shipment");

    let cfg_before_cp = fetch_program_config(&program);
    let next_cp_seq = cfg_before_cp.checkpoints_recorded + 1;
    let (checkpoint_pda, _) = Pubkey::find_program_address(
        &[
            CHECKPOINT_SEED,
            shipment_pda.as_ref(),
            &next_cp_seq.to_le_bytes(),
        ],
        &ID,
    );

    let acc_ship_before = program.rpc().get_account(&shipment_pda).expect("shipment");
    let mut ship_data: &[u8] = acc_ship_before.data.as_slice();
    let ship_before = Shipment::try_deserialize(&mut ship_data).unwrap();
    assert_eq!(ship_before.checkpoint_count, 0);

    program
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
            location: "dock-1".to_string(),
            latitude: None,
            longitude: None,
            temperature: None,
            humidity: None,
            metadata: String::new(),
        })
        .send()
        .expect("record_checkpoint");

    let acc_ship_after = program.rpc().get_account(&shipment_pda).expect("shipment");
    let mut ship_data_after: &[u8] = acc_ship_after.data.as_slice();
    let ship_after = Shipment::try_deserialize(&mut ship_data_after).unwrap();
    assert_eq!(ship_after.checkpoint_count, 1);

    let cp_acc = program
        .rpc()
        .get_account(&checkpoint_pda)
        .expect("checkpoint");
    let checkpoint = Checkpoint::try_deserialize(&mut &cp_acc.data[..]).unwrap();
    assert_eq!(checkpoint.shipment_id, ship_after.id);

    let cfg_after_cp = fetch_program_config(&program);
    assert_eq!(
        cfg_after_cp.checkpoints_recorded,
        cfg_before_cp.checkpoints_recorded + 1
    );

    let actor_acc = program
        .rpc()
        .get_account(&sender_actor_pda)
        .expect("actor");
    let actor_after = Actor::try_deserialize(&mut &actor_acc.data[..]).unwrap();
    assert_eq!(actor_after.checkpoints_recorded, 1);
}
