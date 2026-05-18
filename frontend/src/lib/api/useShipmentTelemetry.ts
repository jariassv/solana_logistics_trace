"use client";

import { useCallback, useEffect, useState } from "react";

import { getShipmentTelemetry, type TelemetryEventItem } from "@/lib/api/telemetry";

export function useShipmentTelemetry(
    apiBaseUrl: string | undefined,
    shipmentId: string,
    wallet: string | null,
) {
    const [items, setItems] = useState<TelemetryEventItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    const reload = useCallback(async () => {
        const base = apiBaseUrl?.trim();
        if (!base || !shipmentId || !wallet) {
            setItems([]);
            setError(null);
            setUnavailable(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setUnavailable(false);
        const res = await getShipmentTelemetry(base, shipmentId, wallet);
        if (res.ok) {
            setItems(res.data);
        } else if (res.status === 404 || res.status === 501) {
            setItems([]);
            setUnavailable(true);
            setError(null);
        } else {
            setItems([]);
            setError(`No se pudo cargar telemetría (HTTP ${res.status}).`);
        }
        setLoading(false);
    }, [apiBaseUrl, shipmentId, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void reload());
    }, [reload]);

    return { items, loading, error, unavailable, reload };
}
