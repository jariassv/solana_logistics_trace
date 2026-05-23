import { describe, expect, it } from "vitest";

import { parseTelemetryEvent, postSampleShipmentTelemetry } from "./telemetry";

describe("parseTelemetryEvent", () => {
    it("parses camelCase telemetry rows", () => {
        const item = parseTelemetryEvent({
            id: "a",
            shipmentId: "s",
            telemetryType: "gps",
            valueNumeric: null,
            latitude: 13.5,
            longitude: -89.2,
            recordedAt: "2026-05-18T12:00:00Z",
        });
        expect(item?.telemetryType).toBe("gps");
        expect(item?.latitude).toBe(13.5);
    });
});

describe("postSampleShipmentTelemetry", () => {
    it("is exported for checkpoint form", () => {
        expect(typeof postSampleShipmentTelemetry).toBe("function");
    });
});
