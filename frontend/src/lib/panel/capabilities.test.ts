import { describe, expect, it } from "vitest";

import {
    canRecordCheckpoint,
    canSenderRegisterShipments,
    canUseChainOperationsNav,
    isKnownActorRole,
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

    it("allows Carrier, Hub, and Recipient to record checkpoints", () => {
        expect(canRecordCheckpoint("Carrier")).toBe(true);
        expect(canRecordCheckpoint("Hub")).toBe(true);
        expect(canRecordCheckpoint("Recipient")).toBe(true);
        expect(canRecordCheckpoint("Sender")).toBe(false);
        expect(canRecordCheckpoint("Inspector")).toBe(false);
    });
});
