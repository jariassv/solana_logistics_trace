use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use rocket::http::{Header, Status};
use rocket::local::asynchronous::Client;
use serial_test::serial;
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

struct MockSolanaOk;

#[async_trait]
impl SolanaRpcClient for MockSolanaOk {
    async fn get_health(&self) -> Result<String, SolanaRpcError> {
        Ok("ok".into())
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
    let rocket = build_rocket(pool, cors, solana);
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
    let cfg = AppConfig::from_env();

    assert_eq!(cfg.backend_port, 9001);
    assert_eq!(
        cfg.cors_allowed_origins,
        vec!["http://a.example", "https://b.example"]
    );
    assert_eq!(cfg.database_url, "");
    assert_eq!(cfg.solana_rpc_url, "http://solana.test/");
}

#[test]
#[serial]
fn config_defaults_solana_rpc_to_local_validator() {
    let _rpc = EnvVarGuard::remove("SOLANA_RPC_URL");
    let _cors = EnvVarGuard::remove("CORS_ALLOWED_ORIGINS");
    let _bp = EnvVarGuard::remove("BACKEND_PORT");
    let _db = EnvVarGuard::set("DATABASE_URL", "");

    let cfg = AppConfig::from_env();

    assert_eq!(cfg.backend_port, 8000);
    assert_eq!(cfg.solana_rpc_url, "http://127.0.0.1:8899");
    assert_eq!(
        cfg.cors_allowed_origins,
        vec![String::from("http://localhost:3000")]
    );
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
