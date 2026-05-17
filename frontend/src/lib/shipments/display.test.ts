import { describe, expect, it } from "vitest";

import { roleDisplayName, statusBadgeClass } from "./display";

describe("shipments display", () => {
    it("maps status to badge class", () => {
        expect(statusBadgeClass("Delivered")).toContain("success");
    });

    it("formats missing role", () => {
        expect(roleDisplayName(null)).toBe("Sin rol en backend");
    });
});
