use logistics_trace_backend::{build_rocket, config::AppConfig, cors, db};

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    dotenvy::dotenv().ok();
    let cfg = AppConfig::from_env();

    if cfg.database_url.is_empty() {
        eprintln!("DATABASE_URL must be set (copy .env.example to .env)");
        std::process::exit(1);
    }

    let pool = db::create_pool(&cfg.database_url)
        .await
        .unwrap_or_else(|e| panic!("PostgreSQL pool: {e}"));

    let cors_policy = cors::cors_for_origins(&cfg.cors_allowed_origins);
    let figment = rocket::Config::figment().merge(("port", cfg.backend_port));

    build_rocket(pool, cors_policy)
        .configure(figment)
        .launch()
        .await?;

    Ok(())
}
