import { describe, expect, it } from "vitest";

import { parseIncidentItem } from "./incidents";

describe("parseIncidentItem", () => {
    it("parses a valid incident row", () => {
        const item = parseIncidentItem({
            id: "inc-1",
            shipmentId: "ship-1",
            incidentType: "COLD_CHAIN_BROKEN",
            severity: "High",
            status: "open",
            source: "auto",
            description: "Temperatura fuera de rango",
            detectedAt: "2026-05-17T12:00:00Z",
            resolvedAt: null,
            ruleName: "cold_chain_max",
            txHash: "system:abc",
        });
        expect(item).toEqual({
            id: "inc-1",
            shipmentId: "ship-1",
            incidentType: "COLD_CHAIN_BROKEN",
            severity: "High",
            status: "open",
            source: "auto",
            description: "Temperatura fuera de rango",
            detectedAt: "2026-05-17T12:00:00Z",
            resolvedAt: null,
            ruleName: "cold_chain_max",
            txHash: "system:abc",
        });
    });

    it("returns null when required fields are missing", () => {
        expect(parseIncidentItem({ id: "x" })).toBeNull();
        expect(parseIncidentItem(null)).toBeNull();
    });
});
