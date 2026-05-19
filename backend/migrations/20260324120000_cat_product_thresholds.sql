-- Umbrales de temperatura y humedad por producto para el motor de incidencias.

ALTER TABLE cat_product
    ADD COLUMN IF NOT EXISTS temp_celsius_min DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS temp_celsius_max DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS humidity_pct_min DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS humidity_pct_max DOUBLE PRECISION NULL;

COMMENT ON COLUMN cat_product.temp_celsius_min IS 'Temperatura mínima permitida (°C) para alertas automáticas';
COMMENT ON COLUMN cat_product.temp_celsius_max IS 'Temperatura máxima permitida (°C) para alertas automáticas';
COMMENT ON COLUMN cat_product.humidity_pct_min IS 'Humedad relativa mínima (%)';
COMMENT ON COLUMN cat_product.humidity_pct_max IS 'Humedad relativa máxima (%)';

UPDATE cat_product SET
    temp_celsius_min = 2.0,
    temp_celsius_max = 8.0,
    humidity_pct_min = NULL,
    humidity_pct_max = NULL
WHERE code IN ('pharma_vaccines', 'pharma_oncology');

UPDATE cat_product SET
    temp_celsius_min = 2.0,
    temp_celsius_max = 6.0,
    humidity_pct_min = NULL,
    humidity_pct_max = NULL
WHERE code = 'blood_products';

UPDATE cat_product SET
    temp_celsius_min = 0.0,
    temp_celsius_max = 4.0,
    humidity_pct_min = NULL,
    humidity_pct_max = NULL
WHERE code = 'fresh_seafood';

UPDATE cat_product SET
    temp_celsius_min = 2.0,
    temp_celsius_max = 6.0,
    humidity_pct_min = NULL,
    humidity_pct_max = NULL
WHERE code = 'dairy_uht';

UPDATE cat_product SET
    temp_celsius_min = 2.0,
    temp_celsius_max = 12.0,
    humidity_pct_min = 70.0,
    humidity_pct_max = 95.0
WHERE code = 'fresh_flowers';

UPDATE cat_product SET
    temp_celsius_min = NULL,
    temp_celsius_max = NULL,
    humidity_pct_min = NULL,
    humidity_pct_max = 55.0
WHERE code = 'agri_seeds';

UPDATE cat_product SET
    temp_celsius_min = NULL,
    temp_celsius_max = NULL,
    humidity_pct_min = NULL,
    humidity_pct_max = 60.0
WHERE code = 'electronics_smd';

INSERT INTO cat_incident_type (code, label, description, sort_order)
VALUES (
    'HUMIDITY_OUT_OF_RANGE',
    'Humedad fuera de rango',
    'Humedad relativa fuera de los límites del producto',
    65
)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

INSERT INTO incident_rules (rule_name, incident_type, severity, condition_json, sort_order)
VALUES (
    'humidity_limit',
    'HUMIDITY_OUT_OF_RANGE',
    'Medium',
    '{"source": "product_catalog"}'::jsonb,
    15
)
ON CONFLICT (rule_name) DO UPDATE SET
    incident_type = EXCLUDED.incident_type,
    severity = EXCLUDED.severity,
    condition_json = EXCLUDED.condition_json;
