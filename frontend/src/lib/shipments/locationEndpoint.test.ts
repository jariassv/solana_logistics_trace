import { describe, expect, it } from "vitest";

import type { LocationCatalogItem } from "@/lib/api/locations";

import { findCatalogLocationByField, resolveEndpointDisplay } from "./locationEndpoint";

const catalog: LocationCatalogItem[] = [
    {
        code: "SV-SSA",
        label: "San Salvador",
        description: "Centro de distribución San Salvador",
        facilityType: "hub",
        facilityTypeLabel: "Hub logístico",
        department: "San Salvador",
        lat: 13.7,
        lng: -89.2,
        sortOrder: 1,
    },
];

describe("resolveEndpointDisplay", () => {
    it("uses catalog description for coordinate fields", () => {
        const d = resolveEndpointDisplay("13.70, -89.20", catalog);
        expect(d.title).toBe("Centro de distribución San Salvador");
        expect(d.subtitle).toContain("San Salvador");
    });

    it("keeps free-text endpoints", () => {
        const d = resolveEndpointDisplay("Bodega cliente Zona Rosa", catalog);
        expect(d.title).toBe("Bodega cliente Zona Rosa");
    });
});

describe("findCatalogLocationByField", () => {
    it("matches stored shipment coordinates", () => {
        const hit = findCatalogLocationByField("13.700,-89.200", catalog);
        expect(hit?.code).toBe("SV-SSA");
    });
});
