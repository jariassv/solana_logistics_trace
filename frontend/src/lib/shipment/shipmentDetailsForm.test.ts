import { describe, expect, it } from "vitest";

import {
    buildShipmentSyncDetails,
    datetimeLocalToIsoUtc,
    EMPTY_SHIPMENT_DETAILS_FORM,
} from "./shipmentDetailsForm";

describe("buildShipmentSyncDetails", () => {
    it("returns empty when all fields blank", () => {
        expect(buildShipmentSyncDetails(EMPTY_SHIPMENT_DETAILS_FORM)).toEqual({});
    });

    it("builds payload with weight and priority", () => {
        const r = buildShipmentSyncDetails({
            ...EMPTY_SHIPMENT_DETAILS_FORM,
            weightKg: "12.5",
            priority: "urgent",
        });
        expect(r.details?.weight_kg).toBe(12.5);
        expect(r.details?.priority).toBe("urgent");
    });

    it("rejects invalid weight", () => {
        const r = buildShipmentSyncDetails({
            ...EMPTY_SHIPMENT_DETAILS_FORM,
            weightKg: "0",
        });
        expect(r.error).toBeTruthy();
    });
});

describe("datetimeLocalToIsoUtc", () => {
    it("parses local datetime", () => {
        const iso = datetimeLocalToIsoUtc("2026-05-20T14:30");
        expect(iso).toMatch(/^2026-05-20/);
    });
});
