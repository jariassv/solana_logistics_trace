-- Tipos de incidencia del motor + reglas MVP (configuración JSON).

INSERT INTO cat_incident_type (code, label, description, sort_order)
VALUES
    ('COLD_CHAIN_BROKEN', 'Ruptura cadena de frío', 'Temperatura fuera de rango', 60),
    ('SHIPMENT_DELAYED', 'Envío retrasado', 'Sin checkpoint reciente', 70),
    ('ROUTE_DEVIATION', 'Desviación de ruta', 'Distancia a ruta esperada', 80),
    ('SENSOR_OFFLINE', 'Sensor sin datos', 'Sin telemetría reciente', 90),
    ('CRITICAL_MANUAL', 'Incidencia crítica manual', 'Reportada y firmada on-chain', 100)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

CREATE TABLE incident_rules (
    rule_name TEXT PRIMARY KEY,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    condition_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO incident_rules (rule_name, incident_type, severity, condition_json, sort_order)
VALUES
    (
        'cold_chain_limit',
        'COLD_CHAIN_BROKEN',
        'High',
        '{"temperature_celsius_max": 8.0}'::jsonb,
        10
    ),
    (
        'shipment_delay',
        'SHIPMENT_DELAYED',
        'Medium',
        '{"hours_without_checkpoint": 2}'::jsonb,
        20
    ),
    (
        'route_deviation',
        'ROUTE_DEVIATION',
        'Medium',
        '{"max_deviation_km": 5.0}'::jsonb,
        30
    ),
    (
        'sensor_offline',
        'SENSOR_OFFLINE',
        'Low',
        '{"minutes_without_telemetry": 10}'::jsonb,
        40
    )
ON CONFLICT (rule_name) DO UPDATE SET
    incident_type = EXCLUDED.incident_type,
    severity = EXCLUDED.severity,
    condition_json = EXCLUDED.condition_json,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;
