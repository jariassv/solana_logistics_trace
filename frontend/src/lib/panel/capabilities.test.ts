import { describe, expect, it } from "vitest";

import {
    canRecordCheckpoint,
    canReportCriticalIncident,
    canResolveIncident,
    canSenderAssignCarrier,
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

    it("allows operational roles except Inspector to resolve incidents", () => {
        expect(canResolveIncident("Carrier")).toBe(true);
        expect(canResolveIncident("Hub")).toBe(true);
        expect(canResolveIncident("Sender")).toBe(true);
        expect(canResolveIncident("Inspector")).toBe(false);
        expect(canResolveIncident(null)).toBe(false);
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

    it("grants operational inventory visibility to Hub and Inspector only", () => {
        expect(seesOperationalShipmentInventory("Carrier")).toBe(false);
        expect(seesOperationalShipmentInventory("Hub")).toBe(true);
        expect(seesOperationalShipmentInventory("Inspector")).toBe(true);
        expect(seesOperationalShipmentInventory("Sender")).toBe(false);
        expect(seesOperationalShipmentInventory("Recipient")).toBe(false);
    });

    it("sender assign carrier gate", () => {
        expect(canSenderAssignCarrier("Sender", "S1", "S1", null, "Created")).toBe(true);
        expect(canSenderAssignCarrier("Sender", "S1", "S2", null, "Created")).toBe(false);
        expect(canSenderAssignCarrier("Sender", "S1", "S1", "C1", "Created")).toBe(false);
    });

    it("formats role display name", () => {
        expect(roleDisplayName("Sender")).toBe("Sender");
        expect(roleDisplayName(null)).toBe("Sin rol en backend");
    });
});
