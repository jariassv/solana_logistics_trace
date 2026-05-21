import { describe, expect, it } from "vitest";

import { roleDisplayName, statusBadgeClass, statusLabel } from "./display";

describe("shipments display", () => {
    it("maps status to badge class", () => {
        expect(statusBadgeClass("Delivered")).toContain("success");
    });

    it("formats missing role", () => {
        expect(roleDisplayName(null)).toBe("Sin rol");
    });

    it("translates shipment status", () => {
        expect(statusLabel("InTransit")).toBe("En tránsito");
    });
});
