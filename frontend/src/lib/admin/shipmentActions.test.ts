import { describe, expect, it } from "vitest";

import {
    canCreateShipmentAction,
    shipmentCardActions,
    statusBadgeClass,
} from "./shipmentActions";

const ready = {
    hasWallet: true,
    programActive: true,
    actorOnChain: true,
};

describe("shipmentCardActions", () => {
    it("enables record_event for Carrier", () => {
        const record = shipmentCardActions({ ...ready, role: "Carrier" }).find(
            (a) => a.id === "record_event",
        );
        expect(record?.enabled).toBe(true);
    });

    it("disables record_event for Sender", () => {
        const record = shipmentCardActions({ ...ready, role: "Sender" }).find(
            (a) => a.id === "record_event",
        );
        expect(record?.enabled).toBe(false);
        expect(record?.reason).toContain("remitente");
    });

    it("enables view_detail with wallet only", () => {
        const view = shipmentCardActions({
            role: "Inspector",
            hasWallet: true,
            programActive: false,
            actorOnChain: false,
        }).find((a) => a.id === "view_detail");
        expect(view?.enabled).toBe(true);
    });

    it("disables view_detail without wallet", () => {
        const view = shipmentCardActions({ ...ready, role: "Carrier", hasWallet: false }).find(
            (a) => a.id === "view_detail",
        );
        expect(view?.enabled).toBe(false);
    });
});

describe("canCreateShipmentAction", () => {
    it("allows Sender when program and actor are ready", () => {
        expect(canCreateShipmentAction({ ...ready, role: "Sender" }).enabled).toBe(true);
    });

    it("denies non-Sender roles", () => {
        const result = canCreateShipmentAction({ ...ready, role: "Carrier" });
        expect(result.enabled).toBe(false);
        expect(result.reason).toContain("Sender");
    });
});

describe("statusBadgeClass", () => {
    it("maps known statuses to badge classes", () => {
        expect(statusBadgeClass("Delivered")).toContain("success");
        expect(statusBadgeClass("Unknown")).toContain("neutral");
    });
});
