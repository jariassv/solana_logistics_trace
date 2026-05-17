import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ShipmentListItem } from "@/lib/api/shipments";

import { AdminShipmentCard } from "./AdminShipmentCard";

const shipment: ShipmentListItem = {
    shipmentId: "ship-abc",
    onChainShipmentId: "7",
    status: "InTransit",
    product: "Vacunas",
    createdAt: "2026-01-15T10:00:00Z",
    requiresColdChain: true,
};

const ready = {
    programConfigured: true,
    actorOnChain: true as boolean | null,
    hasWallet: true,
    detailHref: "/admin/envios/ship-abc",
};

describe("AdminShipmentCard", () => {
    it("links to detail page", () => {
        render(
            <AdminShipmentCard
                shipment={shipment}
                role="Inspector"
                {...ready}
                onRecordEvent={vi.fn()}
            />,
        );

        const link = screen.getByRole("link", { name: /ver detalle/i });
        expect(link).toHaveAttribute("href", "/admin/envios/ship-abc");
    });

    it("fires onRecordEvent for Carrier", () => {
        const onRecordEvent = vi.fn();
        render(
            <AdminShipmentCard
                shipment={shipment}
                role="Carrier"
                {...ready}
                onRecordEvent={onRecordEvent}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /registrar evento/i }));
        expect(onRecordEvent).toHaveBeenCalledWith("ship-abc");
    });

    it("disables record for Sender", () => {
        render(
            <AdminShipmentCard
                shipment={shipment}
                role="Sender"
                {...ready}
                onRecordEvent={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: /registrar evento/i })).toBeDisabled();
    });
});
