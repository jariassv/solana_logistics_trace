#![allow(deprecated)]

use std::ops::Deref;

use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::{read_keypair_file, Signer},
        system_program,
    },
    Client, Cluster, Program,
};
use anchor_lang::AccountDeserialize;

use logistics_traceability::{
    accounts::Initialize as InitAccounts,
    constants::CONFIG_SEED,
    instruction::Initialize as InitIx,
    state::ProgramConfig,
    ID,
};

pub fn load_payer_keypair() -> anchor_client::solana_sdk::signature::Keypair {
    let wallet_path = std::env::var("ANCHOR_WALLET").unwrap_or_else(|_| {
        let home = std::env::var("HOME").expect("HOME required when ANCHOR_WALLET is unset");
        format!("{home}/.config/solana/id.json")
    });
    read_keypair_file(wallet_path.as_str()).expect("read payer keypair")
}

pub fn client_with_payer(
    payer: &anchor_client::solana_sdk::signature::Keypair,
) -> Client<&anchor_client::solana_sdk::signature::Keypair> {
    Client::new_with_options(
        Cluster::Localnet,
        payer,
        CommitmentConfig::confirmed(),
    )
}

pub fn cfg_pda() -> Pubkey {
    Pubkey::find_program_address(&[CONFIG_SEED], &ID).0
}

pub fn initialize_if_needed<C>(program: &Program<C>)
where
    C: Clone + Deref<Target = impl Signer>,
{
    let cfg = cfg_pda();
    if program.rpc().get_account(&cfg).is_err() {
        program
            .request()
            .accounts(InitAccounts {
                authority: program.payer(),
                program_config: cfg,
                system_program: system_program::ID,
            })
            .args(InitIx {})
            .send()
            .expect("initialize");
    }
}

pub fn fetch_program_config<C>(program: &Program<C>) -> ProgramConfig
where
    C: Clone + Deref<Target = impl Signer>,
{
    let pk = cfg_pda();
    let acc = program
        .rpc()
        .get_account(&pk)
        .expect("program config account");
    ProgramConfig::try_deserialize(&mut &acc.data[..]).expect("decode ProgramConfig")
}
