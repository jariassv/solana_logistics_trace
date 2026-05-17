import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import * as programConfig from "@/lib/solana/program_config";

import { validateRecordCheckpointPreflight } from "./chainPreflight";

const PROGRAM = Keypair.generate().publicKey;
const ACTOR_PDA = Keypair.generate().publicKey;

vi.mock("@/lib/solana/pdas", () => ({
    actorPda: () => [ACTOR_PDA, 255],
}));

describe("validateRecordCheckpointPreflight", () => {
    it("reports missing shipment on chain", async () => {
        const authority = Keypair.generate().publicKey;
        const shipmentPk = Keypair.generate().publicKey;
        vi.spyOn(programConfig, "fetchProgramConfig").mockResolvedValue({
            pda: PublicKey.default,
            decoded: {
                authority: PublicKey.default,
                actorsRegistered: 1n,
                shipmentsCreated: 0n,
                checkpointsRecorded: 0n,
                incidentsReported: 0n,
            },
        });
        const connection = {
            getAccountInfo: vi.fn(async (pk: PublicKey) => {
                if (pk.equals(ACTOR_PDA)) {
                    return { data: Buffer.alloc(64), owner: PROGRAM };
                }
                return null;
            }),
        } as unknown as Connection;

        const msg = await validateRecordCheckpointPreflight(
            connection,
            PROGRAM,
            authority,
            shipmentPk,
            "1",
        );
        expect(msg).toMatch(/no existe en la cadena/);
    });
});
