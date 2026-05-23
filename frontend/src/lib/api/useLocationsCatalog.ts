"use client";

import { useEffect, useState } from "react";

import { getLocationsCatalog, type LocationCatalogItem } from "@/lib/api/locations";

function isAbortError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === "AbortError") {
        return true;
    }
    if (e instanceof Error) {
        return e.name === "AbortError" || e.message.toLowerCase().includes("aborted");
    }
    return false;
}

export function useLocationsCatalog(apiBaseUrl: string | undefined) {
    const [items, setItems] = useState<LocationCatalogItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const base = apiBaseUrl?.trim();
        if (!base) {
            queueMicrotask(() => {
                setItems([]);
                setLoading(false);
            });
            return;
        }
        const ac = new AbortController();
        queueMicrotask(() => setLoading(true));
        void getLocationsCatalog(base, ac.signal)
            .then((res) => {
                if (ac.signal.aborted) {
                    return;
                }
                setItems(res.ok ? res.data : []);
                setLoading(false);
            })
            .catch((e: unknown) => {
                if (ac.signal.aborted || isAbortError(e)) {
                    return;
                }
                setItems([]);
                setLoading(false);
            });
        return () => ac.abort();
    }, [apiBaseUrl]);

    return { items, loading };
}
