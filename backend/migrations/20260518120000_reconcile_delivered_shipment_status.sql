-- Envíos con checkpoint Delivered pero status distinto (transiciones MVP incompletas).
UPDATE shipments s
SET status = 'Delivered',
    delivered_at = COALESCE(
        s.delivered_at,
        (SELECT MAX(c.occurred_at)
         FROM checkpoints c
         WHERE c.shipment_id = s.id AND c.type = 'Delivered')
    )
WHERE s.status NOT IN ('Delivered', 'Cancelled', 'Returned')
  AND EXISTS (
      SELECT 1
      FROM checkpoints c
      WHERE c.shipment_id = s.id AND c.type = 'Delivered'
  );
