import { describe, expect, it } from "vitest";

import { adminShipmentDetailHref } from "./AdminShipmentCard";

describe("adminShipmentDetailHref", () => {
    it("encodes shipment id in admin detail path", () => {
        expect(adminShipmentDetailHref("ship/with space")).toBe(
            "/admin/envios/ship%2Fwith%20space",
        );
    });
});
