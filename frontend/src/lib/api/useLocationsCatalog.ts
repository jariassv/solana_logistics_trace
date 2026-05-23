"use client";

import { useEffect, useState } from "react";

import { getLocationsCatalog, type LocationCatalogItem } from "@/lib/api/locations";

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
        void getLocationsCatalog(base, ac.signal).then((res) => {
            if (ac.signal.aborted) {
                return;
            }
            setItems(res.ok ? res.data : []);
            setLoading(false);
        });
        return () => ac.abort();
    }, [apiBaseUrl]);

    return { items, loading };
}
