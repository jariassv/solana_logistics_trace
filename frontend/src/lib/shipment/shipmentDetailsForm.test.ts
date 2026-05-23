import { describe, expect, it } from "vitest";

import {
    buildShipmentSyncDetails,
    dateInputToIsoUtc,
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

describe("dateInputToIsoUtc", () => {
    it("parses date-only input as UTC midnight", () => {
        expect(dateInputToIsoUtc("2026-05-20")).toBe("2026-05-20T00:00:00.000Z");
    });

    it("rejects invalid date", () => {
        expect(dateInputToIsoUtc("2026-13-40")).toBeNull();
    });
});
