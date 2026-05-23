import { describe, expect, it } from "vitest";

import { solanaExplorerTxUrl } from "./explorer";

const SIG = "5".repeat(88);

describe("solanaExplorerTxUrl", () => {
    it("returns devnet cluster link", () => {
        expect(solanaExplorerTxUrl(SIG, "devnet")).toBe(
            `https://explorer.solana.com/tx/${SIG}?cluster=devnet`,
        );
    });

    it("returns mainnet link without cluster param", () => {
        expect(solanaExplorerTxUrl(SIG, "mainnet-beta")).toBe(
            `https://explorer.solana.com/tx/${SIG}`,
        );
    });

    it("returns null for localnet and system hashes", () => {
        expect(solanaExplorerTxUrl(SIG, "localnet")).toBeNull();
        expect(solanaExplorerTxUrl("system:seed", "devnet")).toBeNull();
    });
});
