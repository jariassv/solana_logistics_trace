import type { ShipmentListItem } from "@/lib/api/shipments";

export type ShipmentFilters = {
    query: string;
    status: string;
    coldChain: "" | "yes" | "no";
};

export const EMPTY_SHIPMENT_FILTERS: ShipmentFilters = {
    query: "",
    status: "",
    coldChain: "",
};

export type ShipmentDashboardStats = {
    total: number;
    inProgress: number;
    delivered: number;
    cancelled: number;
    coldChain: number;
};

export function computeShipmentStats(rows: ShipmentListItem[]): ShipmentDashboardStats {
    let inProgress = 0;
    let delivered = 0;
    let cancelled = 0;
    let coldChain = 0;
    for (const row of rows) {
        if (row.status === "Delivered") {
            delivered += 1;
        } else if (row.status === "Cancelled") {
            cancelled += 1;
        } else {
            inProgress += 1;
        }
        if (row.requiresColdChain) {
            coldChain += 1;
        }
    }
    return {
        total: rows.length,
        inProgress,
        delivered,
        cancelled,
        coldChain,
    };
}

export function uniqueShipmentStatuses(rows: ShipmentListItem[]): string[] {
    const set = new Set<string>();
    for (const row of rows) {
        set.add(row.status);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

function matchesQuery(row: ShipmentListItem, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) {
        return true;
    }
    const haystack = [
        row.shipmentId,
        row.onChainShipmentId,
        row.product,
        row.status,
        row.createdAt,
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(q);
}

export function filterShipments(
    rows: ShipmentListItem[],
    filters: ShipmentFilters,
): ShipmentListItem[] {
    return rows.filter((row) => {
        if (filters.status && row.status !== filters.status) {
            return false;
        }
        if (filters.coldChain === "yes" && !row.requiresColdChain) {
            return false;
        }
        if (filters.coldChain === "no" && row.requiresColdChain) {
            return false;
        }
        return matchesQuery(row, filters.query);
    });
}
