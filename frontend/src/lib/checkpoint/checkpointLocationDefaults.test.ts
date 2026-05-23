import { describe, expect, it } from "vitest";

import {
    endpointToGeoPoint,
    resolveCheckpointLocationDefaults,
    shouldPreserveRouteOnMeterSample,
} from "./checkpointLocationDefaults";

const route = {
    origin: "13.70,-89.20",
    destination: "14.10,-88.50",
};

const catalog = [
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

describe("resolveCheckpointLocationDefaults", () => {
    it("uses origin for Pickup", () => {
        const d = resolveCheckpointLocationDefaults("Pickup", route, catalog);
        expect(d.location).toContain("Recogida");
        expect(d.location).toContain("Centro de distribución");
        expect(d.coordinates).toEqual({ lat: 13.7, lng: -89.2 });
    });

    it("uses destination for Delivered", () => {
        const d = resolveCheckpointLocationDefaults("Delivered", route, catalog);
        expect(d.location).toContain("Entrega");
        expect(d.coordinates?.lat).toBeCloseTo(14.1, 1);
    });

    it("prefers meter GPS for Transit", () => {
        const d = resolveCheckpointLocationDefaults("Transit", route, catalog, {
            coordinates: { lat: 13.85, lng: -89.0 },
            temperatureCelsius: null,
            humidityPct: null,
            capturedAt: null,
        });
        expect(d.coordinates).toEqual({ lat: 13.85, lng: -89.0 });
    });
});

describe("endpointToGeoPoint", () => {
    it("parses coordinate strings", () => {
        expect(endpointToGeoPoint("13.5, -89.1")).toEqual({ lat: 13.5, lng: -89.1 });
    });
});

describe("shouldPreserveRouteOnMeterSample", () => {
    it("keeps route-fixed locations when sampling meters", () => {
        expect(shouldPreserveRouteOnMeterSample("Pickup")).toBe(true);
        expect(shouldPreserveRouteOnMeterSample("Delivered")).toBe(true);
        expect(shouldPreserveRouteOnMeterSample("DeliveryAttempt")).toBe(true);
        expect(shouldPreserveRouteOnMeterSample("Transit")).toBe(false);
    });
});
