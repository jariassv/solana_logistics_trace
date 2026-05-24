import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
    catalogSourceLabel,
    extractApiErrorMessage,
    healthProbeUserMessage,
    programStateSummary,
    recipientFieldValidationError,
    userFacingChainError,
    userMessageForSyncFailure,
} from "./etapa1UserMessages";

describe("recipientFieldValidationError", () => {
    it("rejects empty", () => {
        expect(recipientFieldValidationError("")).not.toBeNull();
    });

    it("rejects invalid base58", () => {
        expect(recipientFieldValidationError("not-a-pubkey!!!")).not.toBeNull();
    });

    it("rejects default pubkey", () => {
        expect(recipientFieldValidationError(PublicKey.default.toBase58())).not.toBeNull();
    });

    it("accepts a generated wallet public key", () => {
        const pk = Keypair.generate().publicKey.toBase58();
        expect(recipientFieldValidationError(pk)).toBeNull();
    });
});

describe("extractApiErrorMessage", () => {
    it("reads string error field", () => {
        expect(extractApiErrorMessage({ error: "  x  " })).toBe("x");
    });

    it("returns null when missing", () => {
        expect(extractApiErrorMessage({})).toBeNull();
        expect(extractApiErrorMessage(null)).toBeNull();
    });
});

describe("userMessageForSyncFailure", () => {
    it("maps decode-style backend errors", () => {
        const msg = userMessageForSyncFailure("el envío", 422, {
            error: "failed to decode on-chain account data",
        });
        expect(msg).toContain("servidor");
    });

    it("uses 503 copy", () => {
        const msg = userMessageForSyncFailure("el actor", 503, null);
        expect(msg).toContain("disponible");
    });
});

describe("userFacingChainError", () => {
    it("maps already in use for register_actor", () => {
        const msg = userFacingChainError(
            "register_actor",
            "Allocate: account already in use",
        );
        expect(msg).toContain("cartera");
    });

    it("maps wallet not ready", () => {
        expect(userFacingChainError("initialize", "Wallet o programa no listo")).toContain(
            "billetera",
        );
    });

    it("does not show undefined detail when second arg is missing (regression)", () => {
        const msg = userFacingChainError("assign_carrier", new Error("Simulation failed"));
        expect(msg).not.toContain("undefined");
        expect(msg.length).toBeGreaterThan(10);
    });

    it("maps assign_carrier already assigned", () => {
        const msg = userFacingChainError(
            "assign_carrier",
            "Error: A carrier is already assigned to this shipment",
        );
        expect(msg).toContain("ya tiene");
    });

    it("maps assign_carrier invalid carrier role", () => {
        const msg = userFacingChainError(
            "assign_carrier",
            "Carrier must be a registered active Carrier actor",
        );
        expect(msg).toContain("Carrier");
    });
});

describe("healthProbeUserMessage", () => {
    it("success with database ok", () => {
        const r = healthProbeUserMessage({ ok: true, status: 200, database: "ok" });
        expect(r.ok).toBe(true);
        expect(r.text).toContain("disponible");
    });

    it("failure without reach", () => {
        const r = healthProbeUserMessage({ ok: false, status: 0, hint: "aborted" });
        expect(r.ok).toBe(false);
        expect(r.text).toContain("alcanzar");
    });
});

describe("programStateSummary", () => {
    it("without program id", () => {
        expect(
            programStateSummary({
                hasProgramId: false,
                actors: null,
                shipments: null,
                checkpoints: null,
                configReadable: false,
            }),
        ).toContain("identificador");
    });

    it("with counters", () => {
        const s = programStateSummary({
            hasProgramId: true,
            actors: 2n,
            shipments: 1n,
            checkpoints: 5n,
            configReadable: true,
        });
        expect(s).toContain("Actores: 2");
        expect(s).toContain("Envíos: 1");
    });
});

describe("catalogSourceLabel", () => {
    it("loading", () => {
        expect(catalogSourceLabel({ loading: true, fromApi: false })).toContain("Cargando");
    });

    it("from api", () => {
        expect(catalogSourceLabel({ loading: false, fromApi: true })).toContain("central");
    });
});
