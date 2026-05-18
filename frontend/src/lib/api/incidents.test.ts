import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseIncidentItem, postResolveIncident } from "./incidents";

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

describe("postResolveIncident", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("posts resolve and parses incident response", async () => {
        const fetchSpy = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    id: "inc-1",
                    shipmentId: "ship-1",
                    incidentType: "COLD_CHAIN_BROKEN",
                    severity: "High",
                    status: "Resolved",
                    source: "auto",
                    description: "ok",
                    detectedAt: "2026-05-17T12:00:00Z",
                    resolvedAt: "2026-05-17T13:00:00Z",
                    ruleName: "cold_chain_max",
                    txHash: null,
                }),
        });

        const res = await postResolveIncident(
            "http://localhost:8000/api/v1",
            "inc-1",
            "wallet-1",
        );
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.status).toBe("Resolved");
        }
        expect(fetchSpy.mock.calls[0][0]).toBe(
            "http://localhost:8000/api/v1/incidents/inc-1/resolve?wallet=wallet-1",
        );
        expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe("POST");
    });
});
