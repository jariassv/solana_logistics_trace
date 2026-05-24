import { describe, expect, it } from "vitest";

import {
    canAssignCarrierAction,
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
    it("enables record_event for Carrier at list level", () => {
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

describe("canAssignCarrierAction", () => {
    it("allows sender on open shipment without carrier", () => {
        const result = canAssignCarrierAction({
            ...ready,
            role: "Sender",
            senderWallet: "wallet-sender",
            viewerWallet: "wallet-sender",
            carrierWallet: null,
            shipmentStatus: "Created",
        });
        expect(result.enabled).toBe(true);
    });

    it("denies when carrier already assigned", () => {
        const result = canAssignCarrierAction({
            ...ready,
            role: "Sender",
            senderWallet: "wallet-sender",
            viewerWallet: "wallet-sender",
            carrierWallet: "carrier-1",
            shipmentStatus: "Created",
        });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/ya tiene transportista/);
    });

    it("denies non-sender roles", () => {
        const result = canAssignCarrierAction({
            ...ready,
            role: "Carrier",
            senderWallet: "wallet-sender",
            viewerWallet: "wallet-carrier",
            carrierWallet: null,
            shipmentStatus: "Created",
        });
        expect(result.enabled).toBe(false);
    });
});

describe("canRecordCheckpointAction", () => {
    it("disables while actor on-chain is still unknown", () => {
        const result = canRecordCheckpointAction({ ...ready, role: "Carrier", actorOnChain: null });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/verificar el actor/);
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

    it("disables Carrier when not assigned to shipment", () => {
        const result = canRecordCheckpointAction({
            ...ready,
            role: "Carrier",
            carrierWallet: "OtherWallet",
            viewerWallet: "MyWallet",
            shipmentStatus: "Created",
        });
        expect(result.enabled).toBe(false);
    });

    it("disables checkpoints when shipment is delivered", () => {
        const result = canRecordCheckpointAction({
            ...ready,
            role: "Hub",
            shipmentStatus: "Delivered",
        });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/entregado/);
    });
});

describe("canCreateShipmentAction", () => {
    const createReady = {
        hasWallet: true,
        programConfigured: true,
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

    it("waits while actor profile is loading", () => {
        const result = canCreateShipmentAction({
            ...createReady,
            role: "Sender",
            actorLoading: true,
        });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/Cargando/);
    });

    it("guides Sender when actor missing on chain", () => {
        const result = canCreateShipmentAction({
            ...createReady,
            role: "Sender",
            actorOnChain: false,
        });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/no en la cadena/);
    });

    it("prompts registration when role is unknown", () => {
        const result = canCreateShipmentAction({
            ...createReady,
            role: null,
            actorOnChain: true,
        });
        expect(result.enabled).toBe(false);
        expect(result.reason).toMatch(/registro/);
    });
});

describe("statusBadgeClass", () => {
    it("maps known statuses to badge classes", () => {
        expect(statusBadgeClass("Delivered")).toContain("success");
        expect(statusBadgeClass("Unknown")).toContain("neutral");
    });
});
