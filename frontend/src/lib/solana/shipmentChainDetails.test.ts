import { describe, expect, it } from "vitest";

import { EMPTY_SHIPMENT_DETAILS_FORM } from "@/lib/shipment/shipmentDetailsForm";
import { ShipmentPriorityCode, shipmentDetailsToChainArgs } from "./shipmentChainDetails";

describe("shipmentDetailsToChainArgs", () => {
    it("maps weight and priority to chain args", () => {
        const r = shipmentDetailsToChainArgs({
            ...EMPTY_SHIPMENT_DETAILS_FORM,
            weightKg: "12.5",
            priority: "urgent",
            referenceCode: "PO-1",
        });
        expect(r.error).toBeUndefined();
        expect(r.chain.weightGrams).toBe(12_500);
        expect(r.chain.priority).toBe(ShipmentPriorityCode.Urgent);
        expect(r.chain.referenceCode).toBe("PO-1");
    });

    it("converts date to unix seconds", () => {
        const r = shipmentDetailsToChainArgs({
            ...EMPTY_SHIPMENT_DETAILS_FORM,
            estimatedDeliveryLocal: "2026-05-20",
        });
        expect(r.chain.estimatedDeliveryAt > BigInt(0)).toBe(true);
    });
});
