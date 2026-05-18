//! GET `/api/v1/catalogs/*` — read-only lists from `cat_*` tables.

use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::State;
use sqlx::PgPool;

use crate::repos::{catalogs, locations, products};

#[rocket::get("/catalogs/actor-roles")]
pub async fn get_actor_roles(
    pool: &State<PgPool>,
) -> Result<Json<Vec<catalogs::CatalogItem>>, Status> {
    catalogs::list_actor_roles(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}

#[rocket::get("/catalogs/checkpoint-types")]
pub async fn get_checkpoint_types(
    pool: &State<PgPool>,
) -> Result<Json<Vec<catalogs::CatalogItem>>, Status> {
    catalogs::list_checkpoint_types(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}

#[rocket::get("/catalogs/shipment-statuses")]
pub async fn get_shipment_statuses(
    pool: &State<PgPool>,
) -> Result<Json<Vec<catalogs::CatalogItem>>, Status> {
    catalogs::list_shipment_statuses(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}

#[rocket::get("/catalogs/incident-types")]
pub async fn get_incident_types(
    pool: &State<PgPool>,
) -> Result<Json<Vec<catalogs::CatalogItem>>, Status> {
    catalogs::list_incident_types(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}

#[rocket::get("/catalogs/products")]
pub async fn get_products(
    pool: &State<PgPool>,
) -> Result<Json<Vec<products::ProductCatalogItem>>, Status> {
    products::list_active_products(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}

#[rocket::get("/catalogs/locations")]
pub async fn get_locations(
    pool: &State<PgPool>,
) -> Result<Json<Vec<locations::LocationCatalogItem>>, Status> {
    locations::list_active_locations(pool.inner())
        .await
        .map(Json)
        .map_err(|_| Status::InternalServerError)
}
