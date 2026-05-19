//! Catálogo de productos (`cat_product`) — solo lectura.

use serde::Serialize;
use sqlx::postgres::PgRow;
use sqlx::{FromRow, PgPool, Row};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductCatalogItem {
    pub code: String,
    pub label: String,
    pub description: String,
    pub requires_cold_chain: bool,
    pub temp_celsius_min: Option<f64>,
    pub temp_celsius_max: Option<f64>,
    pub humidity_pct_min: Option<f64>,
    pub humidity_pct_max: Option<f64>,
    pub packaging_type: String,
    pub packaging_label: String,
    pub category: String,
    pub sort_order: i16,
}

impl<'r> FromRow<'r, PgRow> for ProductCatalogItem {
    fn from_row(row: &'r PgRow) -> Result<Self, sqlx::Error> {
        Ok(ProductCatalogItem {
            code: row.try_get("code")?,
            label: row.try_get("label")?,
            description: row.try_get("description")?,
            requires_cold_chain: row.try_get("requires_cold_chain")?,
            temp_celsius_min: row.try_get("temp_celsius_min")?,
            temp_celsius_max: row.try_get("temp_celsius_max")?,
            humidity_pct_min: row.try_get("humidity_pct_min")?,
            humidity_pct_max: row.try_get("humidity_pct_max")?,
            packaging_type: row.try_get("packaging_type")?,
            packaging_label: row.try_get("packaging_label")?,
            category: row.try_get("category")?,
            sort_order: row.try_get("sort_order")?,
        })
    }
}

pub async fn list_active_products(pool: &PgPool) -> Result<Vec<ProductCatalogItem>, sqlx::Error> {
    sqlx::query_as::<_, ProductCatalogItem>(
        r#"SELECT code, label, description, requires_cold_chain,
                  temp_celsius_min, temp_celsius_max, humidity_pct_min, humidity_pct_max,
                  packaging_type, packaging_label, category, sort_order
           FROM cat_product
           WHERE is_active = true
           ORDER BY sort_order, label"#,
    )
    .fetch_all(pool)
    .await
}
