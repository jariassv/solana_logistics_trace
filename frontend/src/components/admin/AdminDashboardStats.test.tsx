import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminDashboardStats } from "./AdminDashboardStats";

describe("AdminDashboardStats", () => {
    it("renders KPI values and filtered count", () => {
        render(
            <AdminDashboardStats
                stats={{
                    total: 4,
                    inProgress: 2,
                    delivered: 1,
                    cancelled: 1,
                    coldChain: 1,
                }}
                loading={false}
                filteredCount={2}
                onRefresh={vi.fn()}
            />,
        );

        expect(screen.getByText("Total envíos")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText(/2 de 4 envíos/)).toBeInTheDocument();
    });

    it("calls onRefresh when button clicked", () => {
        const onRefresh = vi.fn();
        render(
            <AdminDashboardStats
                stats={{
                    total: 1,
                    inProgress: 1,
                    delivered: 0,
                    cancelled: 0,
                    coldChain: 0,
                }}
                loading={false}
                filteredCount={1}
                onRefresh={onRefresh}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /actualizar datos/i }));
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });
});
