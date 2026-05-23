"use client";

import { useCallback, useEffect, useState } from "react";

import {
    getPublicShipmentDetail,
    publicShipmentLookupError,
} from "@/lib/api/publicShipments";
import type { ShipmentDetail } from "@/lib/api/shipments";

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
 * Detalle público `GET /public/shipments/:id` — solo UUID del servicio.
 */
export function usePublicShipmentDetail(apiBaseUrl: string | undefined, shipmentId: string) {
    const base = apiBaseUrl?.trim() ?? "";
    const id = shipmentId.trim();
    const [detail, setDetail] = useState<ShipmentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        if (!base || !id) {
            setDetail(null);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getPublicShipmentDetail(base, id, signal);
            if (signal?.aborted) {
                return;
            }
            if (!res.ok) {
                setDetail(null);
                setError(publicShipmentLookupError(res.status, res.body));
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
    }, [base, id]);

    useEffect(() => {
        const ac = new AbortController();
        void Promise.resolve().then(() => void load(ac.signal));
        return () => ac.abort();
    }, [load]);

    return { detail, error, loading, reload: load };
}
