"use client";

import { useCallback, useEffect, useState } from "react";

import { getShipmentDetail, type ShipmentDetail } from "@/lib/api/shipments";

function isAbortError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === "AbortError") {
        return true;
    }
    if (e instanceof Error) {
        return e.name === "AbortError" || e.message.toLowerCase().includes("aborted");
    }
    return false;
}

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

    const load = useCallback(async (signal?: AbortSignal) => {
        if (!base || !wallet || !shipmentId) {
            setDetail(null);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentDetail(base, shipmentId, wallet, signal);
            if (signal?.aborted) {
                return;
            }
            if (!res.ok) {
                setDetail(null);
                setError(`HTTP ${res.status}`);
                return;
            }
            setDetail(res.data);
        } catch (e) {
            if (signal?.aborted || isAbortError(e)) {
                return;
            }
            setDetail(null);
            setError(e instanceof Error ? e.message : "Error de red");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [base, shipmentId, wallet]);

    useEffect(() => {
        const ac = new AbortController();
        void Promise.resolve().then(() => void load(ac.signal));
        return () => ac.abort();
    }, [load]);

    return { detail, error, loading, reload: load };
}
