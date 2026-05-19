//! Motor de incidencias y telemetría (Etapa 3) — eventos automáticos off-chain.

pub mod gating;
pub mod jobs;
pub mod models;
pub mod processors;
pub mod repositories;
pub mod rules;
pub mod services;
pub mod simulators;

pub use jobs::spawn_incident_engine;
pub use services::monitoring_service::MonitoringService;
