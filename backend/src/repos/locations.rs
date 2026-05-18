//! Catálogo de ubicaciones (`cat_location`) — solo lectura.

use serde::Serialize;
use sqlx::postgres::PgRow;
use sqlx::{FromRow, PgPool, Row};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationCatalogItem {
    pub code: String,
    pub label: String,
    pub description: String,
    pub facility_type: String,
    pub facility_type_label: String,
    pub department: String,
    pub lat: f64,
    pub lng: f64,
    pub sort_order: i16,
}

impl<'r> FromRow<'r, PgRow> for LocationCatalogItem {
    fn from_row(row: &'r PgRow) -> Result<Self, sqlx::Error> {
        Ok(LocationCatalogItem {
            code: row.try_get("code")?,
            label: row.try_get("label")?,
            description: row.try_get("description")?,
            facility_type: row.try_get("facility_type")?,
            facility_type_label: row.try_get("facility_type_label")?,
            department: row.try_get("department")?,
            lat: row.try_get("latitude")?,
            lng: row.try_get("longitude")?,
            sort_order: row.try_get("sort_order")?,
        })
    }
}

pub async fn list_active_locations(pool: &PgPool) -> Result<Vec<LocationCatalogItem>, sqlx::Error> {
    sqlx::query_as::<_, LocationCatalogItem>(
        r#"SELECT code, label, description, facility_type, facility_type_label, department,
                  latitude, longitude, sort_order
           FROM cat_location
           WHERE is_active = true
           ORDER BY sort_order, label"#,
    )
    .fetch_all(pool)
    .await
}
