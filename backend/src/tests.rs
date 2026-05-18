use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use rocket::http::{ContentType, Header, Status};
use rocket::local::asynchronous::Client;
use serial_test::serial;
use bs58;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use wiremock::matchers::method;
use wiremock::{Mock, MockServer, ResponseTemplate};

use crate::build_rocket;
use crate::config::AppConfig;
use crate::cors::cors_for_origins;
use crate::solana::rpc_http::HttpSolanaRpcClient;
use crate::solana::{SolanaRpcClient, SolanaRpcError};

struct EnvVarGuard {
    key: &'static str,
    previous: Option<String>,
}

impl EnvVarGuard {
    fn set(key: &'static str, value: &str) -> Self {
        let previous = std::env::var(key).ok();
        std::env::set_var(key, value);
        Self { key, previous }
    }

    fn remove(key: &'static str) -> Self {
        let previous = std::env::var(key).ok();
        std::env::remove_var(key);
        Self { key, previous }
    }
}

impl Drop for EnvVarGuard {
    fn drop(&mut self) {
        match &self.previous {
            Some(v) => std::env::set_var(self.key, v),
            None => std::env::remove_var(self.key),
        }
    }
}

/// Returns a synthetic `getTransaction` JSON where the program ix data does **not** match
/// `register_actor` (Etapa 1 sync should surface `WrongInstruction`).
struct MockSolanaTxWrongDiscriminator;

#[async_trait]
impl SolanaRpcClient for MockSolanaTxWrongDiscriminator {
    async fn get_health(&self) -> Result<String, SolanaRpcError> {
        Ok("ok".into())
    }

    async fn get_transaction_json(
        &self,
        _signature: &str,
        _commitment: &str,
    ) -> Result<Value, SolanaRpcError> {
        let prog = "BPFLoaderUpgradeab1e11111111111111111111111";
        let wrong = [9u8; 8];
        let mut payload = wrong.to_vec();
        payload.push(1);
        let ix_data = bs58::encode(payload).into_string();
        Ok(json!({
            "transaction": {
                "message": {
                    "accountKeys": [prog],
                    "instructions": [{
                        "programIdIndex": 0u64,
                        "accounts": [0u64],
                        "data": ix_data
                    }]
                }
            },
            "meta": {}
        }))
    }

    async fn get_account_data_base64(
        &self,
        _pubkey: &str,
        _commitment: &str,
    ) -> Result<Option<Vec<u8>>, SolanaRpcError> {
        Ok(None)
    }
}

struct MockSolanaOk;

#[async_trait]
impl SolanaRpcClient for MockSolanaOk {
    async fn get_health(&self) -> Result<String, SolanaRpcError> {
        Ok("ok".into())
    }

    async fn get_transaction_json(
        &self,
        _signature: &str,
        _commitment: &str,
    ) -> Result<Value, SolanaRpcError> {
        Ok(json!({ "result": null }))
    }

    async fn get_account_data_base64(
        &self,
        _pubkey: &str,
        _commitment: &str,
    ) -> Result<Option<Vec<u8>>, SolanaRpcError> {
        Ok(None)
    }
}

fn lazy_unreachable_pool() -> PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(500))
        .connect_lazy("postgres://__:__@127.0.0.1:59432/__no_such_db__")
        .expect("lazy test pool url")
}

async fn tracked_client_with_mock_solana(origins: Vec<String>) -> Client {
    let pool = lazy_unreachable_pool();
    let cors = cors_for_origins(&origins);
    let solana: Arc<dyn SolanaRpcClient> = Arc::new(MockSolanaOk);
    let rocket = build_rocket(pool, cors, solana, AppConfig::for_tests());
    Client::tracked(rocket).await.expect("client")
}

#[tokio::test]
async fn health_endpoint_returns_status_and_database_field() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client.get("/health").dispatch().await;
    assert_eq!(response.status(), Status::Ok);
    let body: Value = response.into_json().await.expect("json");
    assert_eq!(body["status"], "ok");
    assert!(body["database"].is_string());
}

#[tokio::test]
async fn solana_health_endpoint_uses_rpc_trait() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client.get("/api/v1/solana/health").dispatch().await;
    assert_eq!(response.status(), Status::Ok);
    let body: Value = response.into_json().await.expect("json");
    assert_eq!(body["rpc_health"], "ok");
}

#[tokio::test]
async fn catalogs_actor_roles_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/actor-roles")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn catalogs_checkpoint_types_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/checkpoint-types")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn catalogs_shipment_statuses_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/shipment-statuses")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn catalogs_incident_types_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/incident-types")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn catalogs_products_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/products")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn shipment_incidents_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/shipments/00000000-0000-4000-8000-000000000001/incidents?wallet=11111111111111111111111111111111")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn incidents_list_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/incidents?wallet=11111111111111111111111111111111")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn shipment_telemetry_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/shipments/00000000-0000-4000-8000-000000000001/telemetry?wallet=11111111111111111111111111111111")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn incidents_sync_returns_503_when_program_id_unconfigured() {
    let pool = lazy_unreachable_pool();
    let cors = cors_for_origins(&["http://localhost:3000".into()]);
    let mut cfg = AppConfig::for_tests();
    cfg.program_id.clear();
    let solana: Arc<dyn SolanaRpcClient> = Arc::new(MockSolanaOk);
    let rocket = build_rocket(pool, cors, solana, cfg);
    let client = Client::tracked(rocket).await.expect("client");

    let fake_sig = bs58::encode([0u8; 64]).into_string();
    let response = client
        .post("/api/v1/incidents/sync")
        .header(ContentType::JSON)
        .body(json!({ "tx_hash": fake_sig }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::ServiceUnavailable);
}

#[tokio::test]
async fn incidents_sync_returns_422_when_instruction_discriminator_mismatch() {
    let pool = lazy_unreachable_pool();
    let cors = cors_for_origins(&["http://localhost:3000".into()]);
    let mut cfg = AppConfig::for_tests();
    cfg.program_id = "BPFLoaderUpgradeab1e11111111111111111111111".into();
    let solana: Arc<dyn SolanaRpcClient> = Arc::new(MockSolanaTxWrongDiscriminator);
    let rocket = build_rocket(pool, cors, solana, cfg);
    let client = Client::tracked(rocket).await.expect("client");

    let fake_sig = bs58::encode([0u8; 64]).into_string();
    let response = client
        .post("/api/v1/incidents/sync")
        .header(ContentType::JSON)
        .body(json!({ "tx_hash": fake_sig }).to_string())
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::UnprocessableEntity);
}

#[tokio::test]
async fn catalogs_locations_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/catalogs/locations")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn cors_preflight_includes_allow_origin_for_configured_origin() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .options("/health")
        .header(Header::new("Origin", "http://localhost:3000"))
        .header(Header::new("Access-Control-Request-Method", "GET"))
        .dispatch()
        .await;

    assert!(
        response.status() == Status::Ok || response.status() == Status::NoContent,
        "preflight expects 200 OK or 204 No Content",
    );
    let allow_origin = response
        .headers()
        .get_one("access-control-allow-origin")
        .unwrap_or("")
        .to_string();
    assert_eq!(allow_origin, "http://localhost:3000");
}

#[test]
#[serial]
fn config_parses_cors_allowlist_csv() {
    let _b = EnvVarGuard::set("BACKEND_PORT", "9001");
    let _cors = EnvVarGuard::set("CORS_ALLOWED_ORIGINS", "http://a.example, https://b.example ");
    let _db = EnvVarGuard::set("DATABASE_URL", "");
    let _rpc = EnvVarGuard::set("SOLANA_RPC_URL", "http://solana.test/");
    let _pid = EnvVarGuard::remove("PROGRAM_ID");
    let cfg = AppConfig::from_env();

    assert_eq!(cfg.backend_port, 9001);
    assert_eq!(
        cfg.cors_allowed_origins,
        vec!["http://a.example", "https://b.example"]
    );
    assert_eq!(cfg.database_url, "");
    assert_eq!(cfg.solana_rpc_url, "http://solana.test/");
    assert_eq!(cfg.program_id, "");
}

#[test]
#[serial]
fn config_defaults_solana_rpc_to_local_validator() {
    let _rpc = EnvVarGuard::remove("SOLANA_RPC_URL");
    let _cors = EnvVarGuard::remove("CORS_ALLOWED_ORIGINS");
    let _bp = EnvVarGuard::remove("BACKEND_PORT");
    let _db = EnvVarGuard::set("DATABASE_URL", "");
    let _pid = EnvVarGuard::remove("PROGRAM_ID");

    let cfg = AppConfig::from_env();

    assert_eq!(cfg.backend_port, 8000);
    assert_eq!(cfg.solana_rpc_url, "http://127.0.0.1:8899");
    assert_eq!(cfg.program_id, "");
    assert_eq!(
        cfg.cors_allowed_origins,
        vec![String::from("http://localhost:3000")]
    );
}

#[test]
#[serial]
fn config_treats_dotenv_example_program_id_placeholder_as_unset() {
    let _bp = EnvVarGuard::remove("BACKEND_PORT");
    let _cors = EnvVarGuard::remove("CORS_ALLOWED_ORIGINS");
    let _db = EnvVarGuard::set("DATABASE_URL", "");
    let _rpc = EnvVarGuard::set("SOLANA_RPC_URL", "http://127.0.0.1:8899");
    let _pid = EnvVarGuard::set(
        "PROGRAM_ID",
        "  ReplaceWithProgramIdAfterDeploy ",
    );

    let cfg = AppConfig::from_env();
    assert_eq!(cfg.program_id, "");
}

#[tokio::test]
async fn http_rpc_client_reads_get_health_result() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "jsonrpc": "2.0",
            "result": "ok",
            "id": 1,
        })))
        .mount(&mock_server)
        .await;

    let client = HttpSolanaRpcClient::new(mock_server.uri());
    assert_eq!(client.get_health().await.expect("healthy"), "ok");
}

#[tokio::test]
async fn http_rpc_client_fails_on_jsonrpc_error_payload() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "jsonrpc": "2.0",
            "error": {"code": -32005, "message": "timed out"},
            "id": 1,
        })))
        .mount(&mock_server)
        .await;

    let client = HttpSolanaRpcClient::new(mock_server.uri());
    assert!(client.get_health().await.is_err());
}

#[tokio::test]
async fn actors_sync_returns_503_when_program_id_unconfigured() {
    let pool = lazy_unreachable_pool();
    let origins = vec!["http://localhost:3000".into()];
    let cors = cors_for_origins(&origins);
    let mut cfg = AppConfig::for_tests();
    cfg.program_id.clear();
    let solana: Arc<dyn SolanaRpcClient> = Arc::new(MockSolanaOk);
    let rocket = build_rocket(pool, cors, solana, cfg);
    let client = Client::tracked(rocket).await.expect("client");

    let fake_sig = bs58::encode([0u8; 64]).into_string();
    let body = json!({ "tx_hash": fake_sig }).to_string();
    let response = client
        .post("/api/v1/actors/sync")
        .header(ContentType::JSON)
        .body(body)
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::ServiceUnavailable);
}

#[tokio::test]
async fn actors_sync_returns_422_when_instruction_discriminator_mismatch() {
    let pool = lazy_unreachable_pool();
    let origins = vec!["http://localhost:3000".into()];
    let cors = cors_for_origins(&origins);
    let mut cfg = AppConfig::for_tests();
    cfg.program_id = "BPFLoaderUpgradeab1e11111111111111111111111".into();
    let solana: Arc<dyn SolanaRpcClient> = Arc::new(MockSolanaTxWrongDiscriminator);
    let rocket = build_rocket(pool, cors, solana, cfg);
    let client = Client::tracked(rocket).await.expect("client");

    let fake_sig = bs58::encode([0u8; 64]).into_string();
    let body = json!({ "tx_hash": fake_sig }).to_string();
    let response = client
        .post("/api/v1/actors/sync")
        .header(ContentType::JSON)
        .body(body)
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::UnprocessableEntity);
}

#[tokio::test]
async fn shipments_list_returns_400_without_wallet() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client.get("/api/v1/shipments").dispatch().await;
    assert_eq!(response.status(), Status::BadRequest);
}

#[tokio::test]
async fn shipments_list_returns_400_for_invalid_wallet() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/shipments?wallet=not-base58!!!")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::BadRequest);
}

#[tokio::test]
async fn shipments_list_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let valid = bs58::encode([1u8; 32]).into_string();
    let uri = format!("/api/v1/shipments?wallet={}", valid);
    let response = client.get(uri).dispatch().await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn actors_me_returns_400_without_wallet() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client.get("/api/v1/actors/me").dispatch().await;
    assert_eq!(response.status(), Status::BadRequest);
}

#[tokio::test]
async fn actors_recipients_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client.get("/api/v1/actors/recipients").dispatch().await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn public_shipment_returns_500_when_database_unreachable() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/public/shipments/c27c4b9e-f021-4254-b39f-559de2523639")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::InternalServerError);
}

#[tokio::test]
async fn public_shipment_rejects_invalid_uuid_in_path() {
    let client = tracked_client_with_mock_solana(vec!["http://localhost:3000".into()]).await;
    let response = client
        .get("/api/v1/public/shipments/not-a-valid-uuid")
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::UnprocessableEntity);
}

