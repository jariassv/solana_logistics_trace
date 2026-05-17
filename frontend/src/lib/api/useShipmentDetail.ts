"use client";

import { useCallback, useEffect, useState } from "react";

import { getShipmentDetail, type ShipmentDetail } from "@/lib/api/shipments";

/**
 * Detalle `GET /shipments/:id?wallet=` para una wallet participante.
 */
export function useShipmentDetail(
    apiBaseUrl: string | undefined,
    shipmentId: string,
    wallet: string | null,
) {
    const base = apiBaseUrl?.trim() ?? "";
    const [detail, setDetail] = useState<ShipmentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!base || !wallet || !shipmentId) {
            setDetail(null);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentDetail(base, shipmentId, wallet);
            if (!res.ok) {
                setDetail(null);
                setError(`HTTP ${res.status}`);
                return;
            }
            setDetail(res.data);
        } catch (e) {
            setDetail(null);
            setError(e instanceof Error ? e.message : "Error de red");
        } finally {
            setLoading(false);
        }
    }, [base, shipmentId, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void load());
    }, [load]);

    return { detail, error, loading, reload: load };
}
