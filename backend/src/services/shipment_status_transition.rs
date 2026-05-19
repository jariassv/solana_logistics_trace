//! Shipment status transitions after a checkpoint sync (Etapa 2 — PLAN §4).

use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::domain::shipment_status::next_status_after_checkpoint;
use crate::incident_engine::repositories::monitoring;
use crate::repos::checkpoints;

#[must_use]
pub fn resolve_next_status(current_status: &str, checkpoint_type: &str) -> Option<&'static str> {
    next_status_after_checkpoint(current_status, checkpoint_type)
}

pub async fn apply_after_checkpoint_inserted(
    tx: &mut Transaction<'_, Postgres>,
    shipment_id: Uuid,
    checkpoint_type: &str,
    occurred_at: chrono::DateTime<chrono::Utc>,
) -> Result<(), sqlx::Error> {
    let current = checkpoints::select_shipment_status(tx, shipment_id).await?;
    let next = resolve_next_status(&current, checkpoint_type);
    checkpoints::bump_checkpoint_count_update_status(tx, shipment_id, next).await?;

    if checkpoint_type != "SensorData" {
        checkpoints::touch_last_logistics_checkpoint(tx, shipment_id, occurred_at).await?;
    }

    if matches!(next, Some("Delivered") | Some("Cancelled")) {
        if let Err(e) = monitoring::stop_monitoring_tx(tx, shipment_id).await {
            eprintln!("incident_engine: failed to stop monitoring for {shipment_id}: {e}");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::resolve_next_status;

    #[test]
    fn transition_table_matches_plan_mvp() {
        assert_eq!(
            resolve_next_status("Created", "Pickup"),
            Some("InTransit")
        );
        assert_eq!(
            resolve_next_status("InTransit", "HubIn"),
            Some("AtHub")
        );
        assert_eq!(resolve_next_status("AtHub", "HubOut"), Some("InTransit"));
        assert_eq!(
            resolve_next_status("InTransit", "Transit"),
            Some("OutForDelivery")
        );
        assert_eq!(
            resolve_next_status("OutForDelivery", "Delivered"),
            Some("Delivered")
        );
        assert_eq!(resolve_next_status("Created", "HubIn"), None);
    }
}
