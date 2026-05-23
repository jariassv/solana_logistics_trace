#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::{CreateShipment, RegisterActor},
    constants::{ACTOR_SEED, SHIPMENT_SEED},
    instruction::RegisterActor as RegisterActorIx,
    state::{Actor, ActorRole, Shipment, ShipmentStatus},
    ID,
};

use crate::common::*;

#[test]
#[serial_test::serial]
fn create_shipment_increments_program_config_and_sender_actor_counters() {
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

    let cfg_before = fetch_program_config(&program);
    let next_id = cfg_before.shipments_created + 1;
    let (shipment_pda, _) = Pubkey::find_program_address(
        &[SHIPMENT_SEED, &next_id.to_le_bytes()],
        &ID,
    );

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
        .args(crate::common::simple_create_shipment_args(
            "SKU-1",
            "San Salvador",
            "Mexico City",
        ))
        .send()
        .expect("create_shipment");

    let cfg_after = fetch_program_config(&program);
    assert_eq!(cfg_after.shipments_created, cfg_before.shipments_created + 1);

    let sender_acc = program
        .rpc()
        .get_account(&sender_actor_pda)
        .expect("sender actor account");
    let actor = Actor::try_deserialize(&mut &sender_acc.data[..]).expect("decode Actor");
    assert_eq!(actor.shipments_created, 1);

    let shipment_acc = program
        .rpc()
        .get_account(&shipment_pda)
        .expect("shipment account");
    let shipment = Shipment::try_deserialize(&mut &shipment_acc.data[..]).expect("decode Shipment");
    assert_eq!(shipment.id, next_id);
    assert_eq!(shipment.sender, payer.pubkey());
    assert_eq!(shipment.recipient, recipient);
    assert!(shipment.status == ShipmentStatus::Created);
}
