use rocket_cors::{AllowedOrigins, CorsOptions};

/// Builds a CORS policy from exact origin strings (`CORS_ALLOWED_ORIGINS`).
pub fn cors_for_origins(origins: &[String]) -> rocket_cors::Cors {
    let refs: Vec<&str> = origins.iter().map(String::as_str).collect();

    CorsOptions::default()
        .allowed_origins(AllowedOrigins::some_exact(&refs))
        .allow_credentials(false)
        .to_cors()
        .expect("cors builder")
}
