import { describe, expect, it } from "vitest";

import {
    canCreateShipmentAction,
    canRecordCheckpointAction,
    shipmentCardActions,
    statusBadgeClass,
} from "./shipmentActions";

const ready = {
    hasWallet: true,
    programConfigured: true,
    actorOnChain: true as boolean | null,
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
            programConfigured: false,
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

describe("canRecordCheckpointAction", () => {
    it("enables while actor on-chain is still unknown", () => {
        expect(
            canRecordCheckpointAction({ ...ready, role: "Carrier", actorOnChain: null }).enabled,
        ).toBe(true);
    });

    it("disables while actor profile is loading", () => {
        expect(
            canRecordCheckpointAction({
                ...ready,
                role: "Carrier",
                actorLoading: true,
            }).enabled,
        ).toBe(false);
    });
});

describe("canCreateShipmentAction", () => {
    const createReady = {
        hasWallet: true,
        programActive: true,
        actorOnChain: true as boolean | null,
    };

    it("allows Sender when program and actor are ready", () => {
        expect(canCreateShipmentAction({ ...createReady, role: "Sender" }).enabled).toBe(true);
    });

    it("denies non-Sender roles", () => {
        const result = canCreateShipmentAction({ ...createReady, role: "Carrier" });
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
