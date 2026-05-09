#![allow(deprecated)]
use anchor_client::solana_sdk::system_program;
use anchor_client::solana_sdk::signature::Signer;
use anchor_lang::AccountDeserialize;

use logistics_traceability::{state::ProgramConfig, ID};

use crate::common::{cfg_pda, client_with_payer, load_payer_keypair};

#[test]
#[serial_test::serial]
fn initialize_creates_config_once_with_zero_counters() {
    let payer = load_payer_keypair();
    let client = client_with_payer(&payer);
    let program = client.program(ID).unwrap();
    let cfg_pda = cfg_pda();

    let sig = program
        .request()
        .accounts(logistics_traceability::accounts::Initialize {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            system_program: system_program::ID,
        })
        .args(logistics_traceability::instruction::Initialize {})
        .send()
        .expect("first initialize");

    println!("initialize tx {sig}");

    let acc = program
        .rpc()
        .get_account(&cfg_pda)
        .expect("program config account");
    let cfg = ProgramConfig::try_deserialize(&mut &acc.data[..]).expect("decode ProgramConfig");

    assert_eq!(cfg.authority, payer.pubkey());
    assert_eq!(cfg.actors_registered, 0);
    assert_eq!(cfg.shipments_created, 0);
    assert_eq!(cfg.checkpoints_recorded, 0);
    assert_eq!(cfg.incidents_reported, 0);

    let second = program
        .request()
        .accounts(logistics_traceability::accounts::Initialize {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            system_program: system_program::ID,
        })
        .args(logistics_traceability::instruction::Initialize {})
        .send();

    assert!(
        second.is_err(),
        "second initialize must fail once ProgramConfig exists"
    );
}
