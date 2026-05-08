pub mod borsh_accounts;
pub mod decode;
pub mod discriminators;
pub mod parse;
pub mod rpc_http;

use async_trait::async_trait;
use serde_json::Value;

/// Failures while fetching or interpreting chain data for sync (§9).
#[derive(Debug)]
pub enum SolanaSyncError {
    TxNotFound,
    WrongProgram,
    WrongInstruction,
    MalformedTransaction,
    AccountDecode,
    Conflict(String),
    Validation(String),
    Upstream(String),
}

impl std::fmt::Display for SolanaSyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SolanaSyncError::TxNotFound => write!(f, "transaction not found"),
            SolanaSyncError::WrongProgram => write!(f, "program id missing from transaction"),
            SolanaSyncError::WrongInstruction => write!(f, "instruction does not match endpoint"),
            SolanaSyncError::MalformedTransaction => write!(f, "unexpected transaction json layout"),
            SolanaSyncError::AccountDecode => write!(f, "failed to decode on-chain account data"),
            SolanaSyncError::Conflict(msg) => write!(f, "{msg}"),
            SolanaSyncError::Validation(msg) => write!(f, "{msg}"),
            SolanaSyncError::Upstream(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for SolanaSyncError {}

/// Transport or JSON-RPC level failure surfaced to handlers.
#[derive(Debug, Clone)]
pub struct SolanaRpcError(pub String);

impl std::fmt::Display for SolanaRpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for SolanaRpcError {}

impl From<reqwest::Error> for SolanaRpcError {
    fn from(value: reqwest::Error) -> Self {
        SolanaRpcError(value.to_string())
    }
}

/// Abstracts read-only RPC calls used by the API (implementations must remain non-signing).
#[async_trait]
pub trait SolanaRpcClient: Send + Sync {
    /// JSON-RPC [`getHealth`](https://solana.com/docs/rpc/http/gethealth) result (`"ok"` when healthy).
    async fn get_health(&self) -> Result<String, SolanaRpcError>;

    /// [`getTransaction`](https://solana.com/docs/rpc/http/gettransaction) with `encoding: json`.
    async fn get_transaction_json(
        &self,
        signature: &str,
        commitment: &str,
    ) -> Result<Value, SolanaRpcError>;

    /// [`getAccountInfo`](https://solana.com/docs/rpc/http/getaccountinfo) returning raw account data bytes (`encoding: base64`).
    async fn get_account_data_base64(
        &self,
        pubkey: &str,
        commitment: &str,
    ) -> Result<Option<Vec<u8>>, SolanaRpcError>;
}
