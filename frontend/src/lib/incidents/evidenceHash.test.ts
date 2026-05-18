import { describe, expect, it } from "vitest";

import { evidenceHashToHex, sha256EvidenceJson } from "./evidenceHash";

describe("evidenceHash", () => {
    it("produces stable SHA-256 hex for canonical JSON", async () => {
        const payload = { shipmentId: "uuid-1", note: "test" };
        const a = await sha256EvidenceJson(payload);
        const b = await sha256EvidenceJson({ shipmentId: "uuid-1", note: "test" });
        expect(evidenceHashToHex(a)).toBe(evidenceHashToHex(b));
        expect(evidenceHashToHex(a)).toHaveLength(64);
    });

    it("changes hash when evidence content changes", async () => {
        const first = await sha256EvidenceJson({ a: 1 });
        const second = await sha256EvidenceJson({ a: 2 });
        expect(evidenceHashToHex(first)).not.toBe(evidenceHashToHex(second));
    });
});
