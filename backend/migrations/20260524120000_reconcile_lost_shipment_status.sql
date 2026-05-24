-- Envíos con incidencia de pérdida deben reflejar estado Lost en operaciones.

UPDATE shipments s
SET status = 'Lost'
WHERE s.status NOT IN ('Lost', 'Cancelled', 'Delivered')
  AND EXISTS (
      SELECT 1
      FROM incidents i
      WHERE i.shipment_id = s.id
        AND i.incident_type IN ('Lost', 'SHIPMENT_LOST')
  );
