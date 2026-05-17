import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EMPTY_SHIPMENT_FILTERS } from "@/lib/admin/shipmentFilters";

import { AdminShipmentSearch } from "./AdminShipmentSearch";

describe("AdminShipmentSearch", () => {
    it("updates query filter on input", () => {
        const onChange = vi.fn();
        render(
            <AdminShipmentSearch
                filters={EMPTY_SHIPMENT_FILTERS}
                statusOptions={["InTransit", "Delivered"]}
                resultCount={0}
                totalCount={3}
                onChange={onChange}
                onReset={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "flores" } });
        expect(onChange).toHaveBeenCalledWith({ ...EMPTY_SHIPMENT_FILTERS, query: "flores" });
    });

    it("resets filters", () => {
        const onReset = vi.fn();
        render(
            <AdminShipmentSearch
                filters={{ query: "x", status: "Delivered", coldChain: "yes" }}
                statusOptions={["Delivered"]}
                resultCount={1}
                totalCount={5}
                onChange={vi.fn()}
                onReset={onReset}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /limpiar filtros/i }));
        expect(onReset).toHaveBeenCalledTimes(1);
    });
});
