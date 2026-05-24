import { describe, expect, it } from "vitest";

import { canReportCriticalIncidentAction } from "./incidentActions";

describe("canReportCriticalIncidentAction", () => {
    it("allows Sender with wallet and on-chain actor", () => {
        expect(
            canReportCriticalIncidentAction({
                role: "Sender",
                hasWallet: true,
                programConfigured: true,
                actorOnChain: true,
                actorLoading: false,
            }).enabled,
        ).toBe(true);
    });

    it("blocks Inspector and Hub", () => {
        expect(
            canReportCriticalIncidentAction({
                role: "Inspector",
                hasWallet: true,
                programConfigured: true,
                actorOnChain: true,
                actorLoading: false,
            }).enabled,
        ).toBe(false);
        expect(
            canReportCriticalIncidentAction({
                role: "Hub",
                hasWallet: true,
                programConfigured: true,
                actorOnChain: true,
                actorLoading: false,
            }).enabled,
        ).toBe(false);
    });

    it("blocks while actor is loading", () => {
        const gate = canReportCriticalIncidentAction({
            role: "Carrier",
            hasWallet: true,
            programConfigured: true,
            actorOnChain: true,
            actorLoading: true,
        });
        expect(gate.enabled).toBe(false);
        expect(gate.reason).toMatch(/Comprobando/i);
    });

    it("blocks when shipment has registered loss", () => {
        const gate = canReportCriticalIncidentAction({
            role: "Sender",
            hasWallet: true,
            programConfigured: true,
            actorOnChain: true,
            actorLoading: false,
            hasRegisteredLoss: true,
        });
        expect(gate.enabled).toBe(false);
        expect(gate.reason).toMatch(/pérdida registrada/i);
    });
});
