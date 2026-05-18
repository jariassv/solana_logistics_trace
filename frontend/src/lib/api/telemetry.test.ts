import { describe, expect, it } from "vitest";

import { parseTelemetryEvent } from "./telemetry";

describe("parseTelemetryEvent", () => {
    it("parses a valid telemetry row", () => {
        const item = parseTelemetryEvent({
            id: "tel-1",
            shipmentId: "ship-1",
            telemetryType: "temperature",
            valueNumeric: 425,
            latitude: null,
            longitude: null,
            recordedAt: "2026-05-17T12:00:00Z",
        });
        expect(item).toEqual({
            id: "tel-1",
            shipmentId: "ship-1",
            telemetryType: "temperature",
            valueNumeric: 425,
            latitude: null,
            longitude: null,
            recordedAt: "2026-05-17T12:00:00Z",
        });
    });

    it("returns null when required fields are missing", () => {
        expect(parseTelemetryEvent({ id: "x" })).toBeNull();
    });
});
