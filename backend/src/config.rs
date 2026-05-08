use std::env;

/// Runtime settings loaded from the environment (see root `.env.example`).
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub backend_port: u16,
    pub database_url: String,
    pub cors_allowed_origins: Vec<String>,
}

fn parse_origins(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

impl AppConfig {
    pub fn from_env() -> Self {
        let backend_port = env::var("BACKEND_PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(8000);

        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| String::new());

        let cors_allowed_origins = match env::var("CORS_ALLOWED_ORIGINS") {
            Ok(s) => {
                let parsed = parse_origins(&s);
                if parsed.is_empty() {
                    parse_origins("http://localhost:3000")
                } else {
                    parsed
                }
            }
            Err(_) => parse_origins("http://localhost:3000"),
        };

        Self {
            backend_port,
            database_url,
            cors_allowed_origins,
        }
    }
}
