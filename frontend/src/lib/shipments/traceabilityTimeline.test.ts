import { describe, expect, it } from "vitest";

import type { IncidentItem } from "@/lib/api/incidents";
import type { CheckpointItem } from "@/lib/api/shipments";

import { buildTraceabilityTimeline } from "./traceabilityTimeline";

const checkpoint: CheckpointItem = {
    checkpointId: "cp-1",
    onChainCheckpointId: "1",
    type: "Pickup",
    occurredAt: "2026-01-01T10:00:00Z",
    location: null,
    actor: "a",
    actorWalletMasked: "x",
    actorDisplayName: "A",
    actorRole: null,
    temperatureCenti: null,
    humidity: null,
    latitude: null,
    longitude: null,
    metadata: {},
    txHash: null,
};

const criticalIncident: IncidentItem = {
    id: "inc-1",
    shipmentId: "ship-1",
    incidentType: "Lost",
    severity: "Critical",
    status: "Open",
    source: "on_chain",
    description: "Pérdida confirmada",
    detectedAt: "2026-01-01T11:00:00Z",
    resolvedAt: null,
    ruleName: null,
    txHash: "tx",
    evidenceJson: null,
};

describe("buildTraceabilityTimeline", () => {
    it("merges checkpoints and critical incidents chronologically", () => {
        const entries = buildTraceabilityTimeline([checkpoint], [criticalIncident]);
        expect(entries).toHaveLength(2);
        expect(entries[0]?.kind).toBe("checkpoint");
        expect(entries[1]?.kind).toBe("incident");
        if (entries[1]?.kind === "incident") {
            expect(entries[1].isLoss).toBe(true);
        }
    });

    it("excludes non-critical incidents from traceability", () => {
        const high = { ...criticalIncident, id: "inc-2", severity: "High" };
        const entries = buildTraceabilityTimeline([checkpoint], [criticalIncident, high]);
        expect(entries).toHaveLength(2);
        expect(entries.filter((e) => e.kind === "incident")).toHaveLength(1);
    });

    it("orders incident before checkpoint when detected earlier", () => {
        const earlyIncident = { ...criticalIncident, detectedAt: "2026-01-01T09:00:00Z" };
        const entries = buildTraceabilityTimeline([checkpoint], [earlyIncident]);
        expect(entries[0]?.kind).toBe("incident");
        expect(entries[1]?.kind).toBe("checkpoint");
    });
});
