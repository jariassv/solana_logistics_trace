use rocket::{get, serde::json::Json, State};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Serialize)]
pub struct HealthBody {
    pub status: &'static str,
    pub database: &'static str,
}

#[get("/health")]
pub async fn health(pool: &State<PgPool>) -> Json<HealthBody> {
    let database = match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool.inner())
        .await
    {
        Ok(_) => "ok",
        Err(_) => "error",
    };

    Json(HealthBody {
        status: "ok",
        database,
    })
}
