import { describe, expect, it } from "vitest";

import {
    canRecordCheckpoint,
    canReportCriticalIncident,
    checkpointTypeCodesForRole,
    canSenderRegisterShipments,
    canUseChainOperationsNav,
    isKnownActorRole,
    roleDisplayName,
    seesOperationalShipmentInventory,
} from "./capabilities";

describe("panel capabilities", () => {
    it("identifies known actor roles", () => {
        expect(isKnownActorRole("Sender")).toBe(true);
        expect(isKnownActorRole("Unknown")).toBe(false);
        expect(isKnownActorRole(null)).toBe(false);
    });

    it("gates chain nav for Inspector", () => {
        expect(canUseChainOperationsNav(true, "Inspector")).toBe(false);
        expect(canUseChainOperationsNav(true, "Carrier")).toBe(true);
        expect(canUseChainOperationsNav(false, "Carrier")).toBe(false);
    });

    it("allows only Sender to register shipments", () => {
        expect(canSenderRegisterShipments("Sender")).toBe(true);
        expect(canSenderRegisterShipments("Carrier")).toBe(false);
    });

    it("allows Sender, Carrier, and Recipient to report critical incidents", () => {
        expect(canReportCriticalIncident("Sender")).toBe(true);
        expect(canReportCriticalIncident("Carrier")).toBe(true);
        expect(canReportCriticalIncident("Recipient")).toBe(true);
        expect(canReportCriticalIncident("Hub")).toBe(false);
        expect(canReportCriticalIncident("Inspector")).toBe(false);
    });

    it("allows Carrier, Hub, and Recipient to record checkpoints", () => {
        expect(canRecordCheckpoint("Carrier")).toBe(true);
        expect(canRecordCheckpoint("Hub")).toBe(true);
        expect(canRecordCheckpoint("Recipient")).toBe(true);
        expect(canRecordCheckpoint("Sender")).toBe(false);
        expect(canRecordCheckpoint("Inspector")).toBe(false);
    });

    it("maps checkpoint types per logistics role", () => {
        expect(checkpointTypeCodesForRole("Carrier")).toContain("Pickup");
        expect(checkpointTypeCodesForRole("Carrier")).not.toContain("Delivered");
        expect(checkpointTypeCodesForRole("Recipient")).toContain("Delivered");
        expect(checkpointTypeCodesForRole("Sender")).toBeNull();
    });

    it("grants operational inventory visibility to Carrier, Hub, and Inspector", () => {
        expect(seesOperationalShipmentInventory("Carrier")).toBe(true);
        expect(seesOperationalShipmentInventory("Hub")).toBe(true);
        expect(seesOperationalShipmentInventory("Inspector")).toBe(true);
        expect(seesOperationalShipmentInventory("Sender")).toBe(false);
        expect(seesOperationalShipmentInventory("Recipient")).toBe(false);
    });

    it("formats role display name", () => {
        expect(roleDisplayName("Sender")).toBe("Sender");
        expect(roleDisplayName(null)).toBe("Sin rol en backend");
    });
});
