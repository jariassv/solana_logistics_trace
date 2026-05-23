#![allow(deprecated)]

use std::thread;
use std::time::Duration;

use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair, Signature, Signer},
        system_program,
    },
    Client, Cluster, Program,
};
use anchor_lang::AccountDeserialize;
use base64::Engine;
use solana_commitment_config::CommitmentConfig as RpcCommitmentConfig;
use solana_rpc_client_api::config::RpcTransactionConfig;
use solana_transaction_status_client_types::{
    option_serializer::OptionSerializer,
    UiTransactionEncoding,
};

use logistics_traceability::{
    accounts::Initialize as InitAccounts,
    constants::CONFIG_SEED,
    instruction::Initialize as InitIx,
    state::ProgramConfig,
    ID,
};
use solana_rpc_client::rpc_client::RpcClient;

const LOCALNET_RPC: &str = "http://127.0.0.1:8899";

pub fn load_payer_keypair() -> anchor_client::solana_sdk::signature::Keypair {
    let wallet_path = std::env::var("ANCHOR_WALLET").unwrap_or_else(|_| {
        let home = std::env::var("HOME").expect("HOME required when ANCHOR_WALLET is unset");
        format!("{home}/.config/solana/id.json")
    });
    read_keypair_file(wallet_path.as_str()).expect("read payer keypair")
}

/// Fund a fresh keypair on localnet (each integration test gets its own payer → no PDA collisions).
pub fn ephemeral_funded_payer() -> Keypair {
    let kp = Keypair::new();
    ensure_localnet_lamports(&kp, 1_000_000_000);
    kp
}

/// Ensure SOL for fee payer (CLI wallet used by `initialize` idempotency test).
pub fn ensure_localnet_lamports(keypair: &Keypair, min_lamports: u64) {
    let rpc = RpcClient::new_with_commitment(LOCALNET_RPC, RpcCommitmentConfig::confirmed());
    let balance = rpc
        .get_balance(&keypair.pubkey())
        .expect("RPC get_balance failed; start solana-test-validator on localhost:8899");
    if balance >= min_lamports {
        return;
    }
    let sig = rpc
        .request_airdrop(&keypair.pubkey(), 5_000_000_000)
        .expect("localnet airdrop; check validator faucet");
    for _ in 0..60 {
        match rpc.confirm_transaction(&sig) {
            Ok(true) => return,
            Ok(false) | Err(_) => thread::sleep(Duration::from_millis(150)),
        }
    }
    panic!("airdrop confirmation timeout");
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

/// Same payer type as `client_with_payer` → `Program<&Keypair>` (Anchor `Client` pattern).
pub fn initialize_if_needed(program: &Program<&Keypair>) {
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

pub fn fetch_program_config(program: &Program<&Keypair>) -> ProgramConfig {
    let pk = cfg_pda();
    let acc = program
        .rpc()
        .get_account(&pk)
        .expect("program config account");
    ProgramConfig::try_deserialize(&mut &acc.data[..]).expect("decode ProgramConfig")
}

/// Parses `getTransaction` logs (includes Anchor `emit!` `Program data:` lines).
pub fn rpc_transaction_logs(program: &Program<&Keypair>, sig: &Signature) -> Vec<String> {
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Json),
        commitment: Some(RpcCommitmentConfig::confirmed()),
        max_supported_transaction_version: Some(0),
    };
    let response = program
        .rpc()
        .get_transaction_with_config(sig, config)
        .expect("get_transaction");
    let meta = response
        .transaction
        .meta
        .expect("transaction status meta");
    match meta.log_messages {
        OptionSerializer::Some(logs) => logs,
        _ => Vec::new(),
    }
}

use logistics_traceability::{
    instruction::CreateShipment as CreateShipmentArgs,
    state::ShipmentPriority,
};

/// Argumentos mínimos para `create_shipment` en tests de integración.
pub fn simple_create_shipment_args(
    product: &str,
    origin: &str,
    destination: &str,
) -> CreateShipmentArgs {
    create_shipment_args(product, origin, destination, false)
}

pub fn create_shipment_args(
    product: &str,
    origin: &str,
    destination: &str,
    requires_cold_chain: bool,
) -> CreateShipmentArgs {
    CreateShipmentArgs {
        product: product.to_string(),
        origin: origin.to_string(),
        destination: destination.to_string(),
        requires_cold_chain,
        weight_grams: 0,
        quantity: 0,
        quantity_unit: String::new(),
        estimated_delivery_at: 0,
        reference_code: String::new(),
        priority: ShipmentPriority::Normal,
        notes: String::new(),
    }
}

pub fn logs_contain_anchor_event<T>(logs: &[String]) -> bool
where
    T: anchor_lang::Event,
{
    let disc = T::DISCRIMINATOR;
    for line in logs {
        let Some(rest) = line.strip_prefix("Program data: ") else {
            continue;
        };
        let Ok(raw) = base64::engine::general_purpose::STANDARD.decode(rest.trim()) else {
            continue;
        };
        if raw.len() >= disc.len() && raw[..disc.len()] == *disc {
            return true;
        }
    }
    false
}
