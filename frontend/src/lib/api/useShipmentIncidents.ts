"use client";

import { useCallback, useEffect, useState } from "react";

import { getShipmentIncidents, type IncidentItem } from "@/lib/api/incidents";

export function useShipmentIncidents(
    apiBaseUrl: string | undefined,
    shipmentId: string,
    wallet: string | null,
) {
    const [items, setItems] = useState<IncidentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const base = apiBaseUrl?.trim();
        if (!base || !shipmentId || !wallet) {
            setItems([]);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        const res = await getShipmentIncidents(base, shipmentId, wallet);
        if (res.ok) {
            setItems(res.data);
        } else {
            setItems([]);
            setError(
                res.status === 404
                    ? "Envío no encontrado o sin permiso."
                    : `No se pudieron cargar incidencias (HTTP ${res.status}).`,
            );
        }
        setLoading(false);
    }, [apiBaseUrl, shipmentId, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void reload());
    }, [reload]);

    return { items, loading, error, reload };
}
