import { describe, expect, it } from "vitest";

import type { ShipmentListItem } from "@/lib/api/shipments";

import {
    computeShipmentStats,
    filterShipments,
    uniqueShipmentStatuses,
} from "./shipmentFilters";

function row(partial: Partial<ShipmentListItem> & Pick<ShipmentListItem, "shipmentId">): ShipmentListItem {
    return {
        onChainShipmentId: "1",
        status: "InTransit",
        product: "Caja",
        createdAt: "2026-01-01",
        requiresColdChain: false,
        ...partial,
    };
}

describe("shipmentFilters", () => {
    const rows: ShipmentListItem[] = [
        row({ shipmentId: "a", status: "Delivered", product: "Flores" }),
        row({ shipmentId: "b", status: "Cancelled", product: "Papel" }),
        row({
            shipmentId: "c",
            status: "InTransit",
            product: "Vacuna",
            requiresColdChain: true,
        }),
    ];

    it("computes dashboard stats", () => {
        expect(computeShipmentStats(rows)).toEqual({
            total: 3,
            inProgress: 1,
            delivered: 1,
            cancelled: 1,
            coldChain: 1,
        });
    });

    it("filters by query and status", () => {
        const out = filterShipments(rows, {
            query: "vacuna",
            status: "InTransit",
            coldChain: "yes",
        });
        expect(out).toHaveLength(1);
        expect(out[0]?.shipmentId).toBe("c");
    });

    it("lists unique statuses", () => {
        expect(uniqueShipmentStatuses(rows)).toEqual(["Cancelled", "Delivered", "InTransit"]);
    });
});
