import { describe, expect, it } from "vitest";

import { buildMonitoringGlance } from "./monitoringGlance";

describe("buildMonitoringGlance", () => {
    it("returns latest reading per sensor type", () => {
        const glance = buildMonitoringGlance([
            {
                id: "1",
                shipmentId: "s",
                telemetryType: "temperature",
                valueNumeric: 5.2,
                latitude: null,
                longitude: null,
                recordedAt: "2026-05-18T10:00:00Z",
            },
            {
                id: "2",
                shipmentId: "s",
                telemetryType: "temperature",
                valueNumeric: 6.1,
                latitude: null,
                longitude: null,
                recordedAt: "2026-05-18T11:00:00Z",
            },
        ]);
        expect(glance).toHaveLength(1);
        expect(glance[0]?.value).toBe("6.1 °C");
    });
});
