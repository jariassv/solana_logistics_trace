import { describe, expect, it, vi } from "vitest";

import { getRecipientActors } from "./actors";

describe("getRecipientActors", () => {
    it("parses recipient list from API", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () =>
                    JSON.stringify([
                        {
                            wallet: "GxCypWgviPMCEw2oti6sJSTG5AwGRksFBmetRcDuAJF8",
                            name: "Destino Central",
                            walletMasked: "GxCy…AJF8",
                            displayLabel: "Destino Central — GxCy…AJF8",
                        },
                    ]),
            }),
        );
        const res = await getRecipientActors("http://localhost:8001/api/v1");
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data).toHaveLength(1);
            expect(res.data[0]?.displayLabel).toContain("Destino Central");
        }
        vi.unstubAllGlobals();
    });
});
