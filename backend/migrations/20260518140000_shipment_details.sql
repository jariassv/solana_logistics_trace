-- Detalles operativos del envío (off-chain; no en cuenta Solana).

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS quantity INTEGER,
    ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(32),
    ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reference_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE shipments
    DROP CONSTRAINT IF EXISTS shipments_priority_check;

ALTER TABLE shipments
    ADD CONSTRAINT shipments_priority_check
    CHECK (priority IN ('normal', 'urgent', 'express'));

COMMENT ON COLUMN shipments.weight_kg IS 'Peso bruto del envío en kilogramos';
COMMENT ON COLUMN shipments.quantity IS 'Cantidad de unidades/bultos';
COMMENT ON COLUMN shipments.quantity_unit IS 'Unidad de cantidad (cajas, pallets, etc.)';
COMMENT ON COLUMN shipments.estimated_delivery_at IS 'Fecha/hora estimada de entrega';
COMMENT ON COLUMN shipments.reference_code IS 'Referencia externa (pedido, OC)';
COMMENT ON COLUMN shipments.priority IS 'Prioridad logística: normal | urgent | express';
COMMENT ON COLUMN shipments.notes IS 'Instrucciones o notas del remitente';
