#[allow(deprecated)]
use anchor_client::solana_sdk::system_program;

use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::read_keypair_file,
    },
    Client, Cluster,
};
use anchor_lang::AccountDeserialize;
use anchor_client::solana_sdk::signature::Signer;

use logistics_traceability::constants::CONFIG_SEED;
use logistics_traceability::{state::ProgramConfig, ID};

fn load_payer_keypair() -> anchor_client::solana_sdk::signature::Keypair {
    let wallet_path = std::env::var("ANCHOR_WALLET").unwrap_or_else(|_| {
        let home = std::env::var("HOME").expect("HOME required when ANCHOR_WALLET is unset");
        format!("{home}/.config/solana/id.json")
    });
    read_keypair_file(wallet_path.as_str()).expect("read payer keypair")
}

#[test]
fn initialize_sets_config_authority_and_zero_counters() {
    let payer = load_payer_keypair();
    let client =
        Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());
    let program = client.program(ID).unwrap();
    let (cfg_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], &ID);

    let sig = program
        .request()
        .accounts(logistics_traceability::accounts::Initialize {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            system_program: system_program::ID,
        })
        .args(logistics_traceability::instruction::Initialize {})
        .send()
        .expect("initialize");

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
}

#[test]
fn initialize_rejects_second_call() {
    let payer = load_payer_keypair();
    let client =
        Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());
    let program = client.program(ID).unwrap();
    let (cfg_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], &ID);

    program
        .request()
        .accounts(logistics_traceability::accounts::Initialize {
            authority: payer.pubkey(),
            program_config: cfg_pda,
            system_program: system_program::ID,
        })
        .args(logistics_traceability::instruction::Initialize {})
        .send()
        .expect("first initialize");

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
