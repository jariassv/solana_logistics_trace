import { describe, expect, it } from "vitest";

import { canAccessConsola } from "./access";

describe("canAccessConsola", () => {
    const authority = "Auth1111111111111111111111111111111111111111";

    it("denies without wallet", () => {
        expect(
            canAccessConsola({
                wallet: null,
                programActive: false,
                programAuthority: null,
            }),
        ).toBe(false);
    });

    it("allows any connected wallet when program is inactive", () => {
        expect(
            canAccessConsola({
                wallet: "Other1111111111111111111111111111111111111",
                programActive: false,
                programAuthority: null,
            }),
        ).toBe(true);
    });

    it("allows only program authority when program is active", () => {
        expect(
            canAccessConsola({
                wallet: authority,
                programActive: true,
                programAuthority: authority,
            }),
        ).toBe(true);
        expect(
            canAccessConsola({
                wallet: "Other1111111111111111111111111111111111111",
                programActive: true,
                programAuthority: authority,
            }),
        ).toBe(false);
    });
});
