import { Keypair } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as pdas from "@/lib/solana/pdas";

import { shipmentPdaFromOnChainId } from "./shipmentPda";

vi.mock("@/lib/solana/pdas", () => ({
    shipmentPda: vi.fn(),
}));

describe("shipmentPdaFromOnChainId", () => {
    const programId = Keypair.generate().publicKey;
    const mockPda = Keypair.generate().publicKey;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(pdas.shipmentPda).mockReturnValue([mockPda, 255]);
    });

    it("returns PDA from shipmentPda helper", () => {
        const pda = shipmentPdaFromOnChainId(programId, "42");
        expect(pda).toEqual(mockPda);
        expect(pdas.shipmentPda).toHaveBeenCalledWith(programId, 42n);
    });

    it("returns null for invalid id", () => {
        expect(shipmentPdaFromOnChainId(programId, "not-a-number")).toBeNull();
        expect(pdas.shipmentPda).not.toHaveBeenCalled();
    });
});
