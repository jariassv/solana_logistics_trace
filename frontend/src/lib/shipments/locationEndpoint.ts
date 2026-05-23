import type { LocationCatalogItem } from "@/lib/api/locations";

import { parseCoordEndpoint } from "./journeyTimeline";

const COORD_EPS = 0.0005;

export type EndpointDisplay = {
    title: string;
    subtitle: string | null;
};

export function coordsNear(aLat: number, aLng: number, bLat: number, bLng: number): boolean {
    return Math.abs(aLat - bLat) <= COORD_EPS && Math.abs(aLng - bLng) <= COORD_EPS;
}

export function findCatalogLocationByField(
    raw: string,
    catalog: readonly LocationCatalogItem[],
): LocationCatalogItem | null {
    const parsed = parseCoordEndpoint(raw);
    if (parsed.lat == null || parsed.lng == null) {
        return null;
    }
    for (const item of catalog) {
        if (coordsNear(item.lat, item.lng, parsed.lat, parsed.lng)) {
            return item;
        }
    }
    return null;
}

/** Texto legible para origen/destino (descripción de catálogo o texto libre). */
export function resolveEndpointDisplay(
    raw: string,
    catalog?: readonly LocationCatalogItem[],
): EndpointDisplay {
    const trimmed = raw.trim();
    const parsed = parseCoordEndpoint(trimmed);
    if (parsed.lat == null || parsed.lng == null) {
        return { title: trimmed || "Sin descripción", subtitle: null };
    }
    const match = catalog?.length ? findCatalogLocationByField(trimmed, catalog) : null;
    if (match) {
        const title = match.description.trim() || match.label;
        const subtitleParts = [match.label, match.facilityTypeLabel, match.department].filter(
            (p) => p && p.length > 0,
        );
        const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : null;
        return { title, subtitle };
    }
    return {
        title: "Ubicación registrada",
        subtitle: null,
    };
}
