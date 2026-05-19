//! Workers en segundo plano (tokio).

use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use tokio::time::interval;

use crate::incident_engine::repositories::monitoring;
use crate::incident_engine::services::rule_engine_service::RuleEngineService;
use crate::incident_engine::simulators;

pub fn spawn_incident_engine(pool: PgPool, enabled: bool) {
    if !enabled {
        return;
    }

    let pool = Arc::new(pool);

    {
        let pool = Arc::clone(&pool);
        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(30));
            loop {
                tick.tick().await;
                if let Ok(ids) = monitoring::list_active_shipment_ids(pool.as_ref()).await {
                    for shipment_id in ids {
                        let _ =
                            simulators::simulate_temperature_for_shipment(pool.as_ref(), shipment_id)
                                .await;
                    }
                }
            }
        });
    }

    {
        let pool = Arc::clone(&pool);
        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(20));
            loop {
                tick.tick().await;
                if let Ok(ids) = monitoring::list_active_shipment_ids(pool.as_ref()).await {
                    for shipment_id in ids {
                        let _ = simulators::simulate_gps_for_shipment(pool.as_ref(), shipment_id).await;
                    }
                }
            }
        });
    }

    {
        let pool = Arc::clone(&pool);
        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(45));
            loop {
                tick.tick().await;
                if let Ok(ids) = monitoring::list_active_shipment_ids(pool.as_ref()).await {
                    for shipment_id in ids {
                        let _ =
                            simulators::simulate_humidity_for_shipment(pool.as_ref(), shipment_id)
                                .await;
                    }
                }
            }
        });
    }

    {
        let pool = Arc::clone(&pool);
        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(300));
            loop {
                tick.tick().await;
                if let Ok(ids) = monitoring::list_active_shipment_ids(pool.as_ref()).await {
                    for shipment_id in ids {
                        let _ = RuleEngineService::scan_shipment(pool.as_ref(), shipment_id).await;
                    }
                }
            }
        });
    }
}
