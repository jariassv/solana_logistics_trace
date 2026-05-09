#![allow(deprecated)]

use anchor_client::solana_sdk::system_program;
use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::Signer,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::RegisterActor,
    constants::ACTOR_SEED,
    instruction::RegisterActor as RegisterActorIx,
    state::{Actor, ActorRole},
    ID,
};

use crate::common::*;

#[test]
#[serial_test::serial]
fn register_actor_happy_path_writes_actor_account() {
    let payer = load_payer_keypair();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let cfg_pda = cfg_pda();
    let (actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, payer.pubkey().as_ref()], &ID);

    program
        .request()
        .accounts(RegisterActor {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            actor: actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "Test Sender".to_string(),
            location: String::new(),
        })
        .send()
        .expect("register_actor");

    let acc = program
        .rpc()
        .get_account(&actor_pda)
        .expect("actor account");
    let actor = Actor::try_deserialize(&mut &acc.data[..]).expect("decode Actor");
    assert_eq!(actor.wallet, payer.pubkey());
    assert_eq!(actor.role, ActorRole::Sender);
    assert_eq!(actor.name, "Test Sender");
    assert_eq!(actor.location, None);
    assert!(actor.is_active);

    let cfg = fetch_program_config(&program);
    assert_eq!(cfg.actors_registered, 1);
}

#[test]
#[serial_test::serial]
fn register_actor_rejects_empty_name() {
    let payer = load_payer_keypair();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let cfg_pda = cfg_pda();
    let (actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, payer.pubkey().as_ref()], &ID);

    let err = program
        .request()
        .accounts(RegisterActor {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            actor: actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: String::new(),
            location: String::new(),
        })
        .send();

    assert!(err.is_err(), "empty name must fail InvalidActorName");
}

#[test]
#[serial_test::serial]
fn register_actor_rejects_location_too_long() {
    let payer = load_payer_keypair();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    initialize_if_needed(&program);

    let cfg_pda = cfg_pda();
    let (actor_pda, _) =
        Pubkey::find_program_address(&[ACTOR_SEED, payer.pubkey().as_ref()], &ID);

    let loc = "a".repeat(257);
    let err = program
        .request()
        .accounts(RegisterActor {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            actor: actor_pda,
            system_program: system_program::ID,
        })
        .args(RegisterActorIx {
            role: ActorRole::Sender,
            name: "ok".to_string(),
            location: loc,
        })
        .send();

    assert!(err.is_err(), "location >256 bytes must fail LocationTooLong");
}
