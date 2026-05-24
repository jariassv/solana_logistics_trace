import { describe, expect, it } from "vitest";

import type { CheckpointItem } from "@/lib/api/shipments";

import {
    buildJourneyStepInsight,
    JOURNEY_EVENT_STEPS,
    parseCoordEndpoint,
    resolveJourneyStepStates,
    resolveNowStepId,
    resolveOperationalJourneyStepId,
    statusToJourneyStepId,
} from "./journeyTimeline";

describe("parseCoordEndpoint", () => {
    it("formats lat,lng pairs", () => {
        const c = parseCoordEndpoint("13.70, -89.20");
        expect(c.label).toBe("13.70°, -89.20°");
        expect(c.lat).toBe(13.7);
    });
});

describe("JOURNEY_EVENT_STEPS order", () => {
    it("places transit before hub", () => {
        const ids = JOURNEY_EVENT_STEPS.map((s) => s.id);
        expect(ids.indexOf("transit")).toBeLessThan(ids.indexOf("hub"));
    });
});

describe("resolveJourneyStepStates", () => {
    it("highlights InTransit as current on transit step", () => {
        const steps = resolveJourneyStepStates("InTransit", ["Pickup"]);
        const current = steps.find((s) => s.state === "current");
        expect(current?.step.id).toBe("transit");
    });

    it("keeps hub future when in transit after pickup only", () => {
        const steps = resolveJourneyStepStates("InTransit", ["Pickup"]);
        const hub = steps.find((s) => s.step.id === "hub");
        expect(hub?.state).toBe("future");
    });

    it("marks pickup past when checkpoint exists", () => {
        const steps = resolveJourneyStepStates("InTransit", ["Pickup"]);
        const pickup = steps.find((s) => s.step.id === "pickup");
        expect(pickup?.state).toBe("past");
        expect(pickup?.eventRecorded).toBe(true);
    });

    it("created is current for new shipments", () => {
        const steps = resolveJourneyStepStates("Created", []);
        expect(steps[0]?.state).toBe("current");
    });

    it("highlights hub when status is AtHub", () => {
        const steps = resolveJourneyStepStates("AtHub", ["Pickup", "Transit"]);
        const hub = steps.find((s) => s.step.id === "hub");
        expect(hub?.state).toBe("current");
    });
});

describe("statusToJourneyStepId", () => {
    it("maps InTransit to transit step", () => {
        expect(statusToJourneyStepId("InTransit")).toBe("transit");
    });

    it("maps AtHub to hub step", () => {
        expect(statusToJourneyStepId("AtHub")).toBe("hub");
    });
});

describe("resolveOperationalJourneyStepId", () => {
    const pickupCp: CheckpointItem = {
        checkpointId: "1",
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
        txHash: "t1",
    };

    it("uses shipment status over latest checkpoint when in transit", () => {
        expect(resolveOperationalJourneyStepId("InTransit", [pickupCp])).toBe("transit");
    });

    it("falls back to checkpoints for Created status", () => {
        expect(resolveOperationalJourneyStepId("Created", [])).toBe("created");
        expect(resolveOperationalJourneyStepId("Created", [pickupCp])).toBe("pickup");
    });
});

describe("resolveNowStepId", () => {
    const pickupCp: CheckpointItem = {
        checkpointId: "1",
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
        txHash: "t1",
    };
    const transitCp: CheckpointItem = {
        ...pickupCp,
        checkpointId: "2",
        type: "Transit",
        occurredAt: "2026-01-02T12:00:00Z",
    };

    it("uses latest logistics checkpoint", () => {
        expect(resolveNowStepId([pickupCp, transitCp], "2026-01-01T09:00:00Z")).toBe("transit");
    });

    it("defaults to created without checkpoints", () => {
        expect(resolveNowStepId([], "2026-01-01T09:00:00Z")).toBe("created");
    });
});

describe("buildJourneyStepInsight", () => {
    const pickupCp: CheckpointItem = {
        checkpointId: "1",
        onChainCheckpointId: "1",
        type: "Pickup",
        occurredAt: "2026-01-01T10:00:00Z",
        location: "Muelle 3",
        actor: "a",
        actorWalletMasked: "abcd…wxyz",
        actorDisplayName: "Operador",
        actorRole: "Carrier",
        temperatureCenti: null,
        humidity: null,
        latitude: null,
        longitude: null,
        metadata: {},
        txHash: "sig123",
    };

    it("includes checkpoint details when recorded", () => {
        const step = JOURNEY_EVENT_STEPS.find((s) => s.id === "pickup")!;
        const insight = buildJourneyStepInsight(step, "past", [pickupCp], "2026-01-01T09:00:00Z");
        expect(insight.lines[0]).toBe("Recogida");
        expect(insight.lines).toContain("Muelle 3");
    });
});
