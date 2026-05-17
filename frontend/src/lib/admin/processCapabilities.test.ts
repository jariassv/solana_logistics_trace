import { describe, expect, it } from "vitest";

import {
    adminStepLabel,
    roleDisplayName,
    roleMayExecuteStep,
    stepLockReason,
    stepVisualStatus,
    type AdminProcessContext,
} from "./processCapabilities";

function baseContext(overrides: Partial<AdminProcessContext> = {}): AdminProcessContext {
    return {
        walletConnected: true,
        programConfigured: true,
        programActive: true,
        actorOnChain: true,
        actorInBackend: true,
        selectedShipmentId: "ship-1",
        hasShipments: true,
        role: "Carrier",
        ...overrides,
    };
}

describe("processCapabilities", () => {
    it("returns Spanish labels for steps", () => {
        expect(adminStepLabel("record_checkpoint")).toBe("Evento logístico");
    });

    it("roleMayExecuteStep blocks Inspector from checkpoints", () => {
        expect(roleMayExecuteStep("record_checkpoint", "Inspector")).toBe(false);
        expect(roleMayExecuteStep("record_checkpoint", "Carrier")).toBe(true);
    });

    it("stepVisualStatus locks record_checkpoint without shipment", () => {
        const ctx = baseContext({ selectedShipmentId: null });
        expect(stepVisualStatus("record_checkpoint", ctx)).toBe("locked");
        expect(stepLockReason("record_checkpoint", ctx)).toContain("tarjetas");
    });

    it("roleDisplayName falls back when role missing", () => {
        expect(roleDisplayName(null)).toBe("Sin rol en backend");
        expect(roleDisplayName("Sender")).toBe("Sender");
    });
});
