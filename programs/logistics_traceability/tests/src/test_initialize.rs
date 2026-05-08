use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::read_keypair_file,
    },
    Client, Cluster,
};
use anchor_client::solana_sdk::signature::Signer;

#[test]
fn test_initialize() {
    let wallet_path = std::env::var("ANCHOR_WALLET").unwrap_or_else(|_| {
        let home = std::env::var("HOME").expect("HOME required when ANCHOR_WALLET is unset");
        format!("{home}/.config/solana/id.json")
    });

    let payer = read_keypair_file(wallet_path.as_str()).expect("read payer keypair");
    let client =
        Client::new_with_options(Cluster::Localnet, &payer, CommitmentConfig::confirmed());

    let program_pk: Pubkey = logistics_traceability::ID;
    let program = client.program(program_pk).unwrap();

    let sig = program
        .request()
        .accounts(logistics_traceability::accounts::Initialize {})
        .args(logistics_traceability::instruction::Initialize {})
        .send()
        .expect("initialize");

    println!("initialize tx {sig}");
}
