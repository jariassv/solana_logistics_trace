#![allow(deprecated)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::{AssignCarrier, CreateShipment, RegisterActor},
    constants::{ACTOR_SEED, SHIPMENT_SEED},
    instruction::{
        AssignCarrier as AssignCarrierIx, CreateShipment as CreateShipmentIx,
        RegisterActor as RegisterActorIx,
    },
    state::{ActorRole, Shipment},
    ID,
};

use crate::common::*;

#[test]
#[serial_test::serial]
fn sender_assigns_carrier_once() {
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
        .expect("register sender");

    let carrier_kp = Keypair::new();
    fund_keypair(&carrier_kp);
    let (carrier_actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, carrier_kp.pubkey().as_ref()], &ID);
    let carrier_program = client_with_payer(&carrier_kp).program(ID).unwrap();
    carrier_program
        .request()
        .accounts(RegisterActor {
            authority: carrier_kp.pubkey(),
            program_config: cfg_pda,
            actor: carrier_actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Carrier,
            name: "Carrier Co".to_string(),
            location: "Hub".to_string(),
        })
        .send()
        .expect("register carrier");

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
        .args(simple_create_shipment_args("SKU", "O", "D"))
        .send()
        .expect("create_shipment");

    program
        .request()
        .accounts(AssignCarrier {
            sender: payer.pubkey(),
            shipment: shipment_pda,
            carrier: carrier_kp.pubkey(),
            carrier_actor: carrier_actor_pda,
        })
        .args(AssignCarrierIx {})
        .send()
        .expect("assign_carrier");

    let shipment_account = program.account::<Shipment>(shipment_pda).unwrap();
    assert_eq!(shipment_account.carrier, carrier_kp.pubkey());
}
