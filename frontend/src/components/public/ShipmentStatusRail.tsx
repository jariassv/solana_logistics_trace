"use client";

import { ShipmentJourneyTimeline } from "@/components/shipments/ShipmentJourneyTimeline";
import type { IncidentItem } from "@/lib/api/incidents";
import type { CheckpointItem } from "@/lib/api/shipments";

export type ShipmentStatusRailProps = {
    status: string;
    origin?: string;
    destination?: string;
    checkpoints?: CheckpointItem[];
    createdAt?: string;
    apiBaseUrl?: string;
    incidents?: IncidentItem[];
};

/**
 * Rail del ciclo logístico en consulta pública (misma UX que detalle operativo).
 */
export function ShipmentStatusRail({
    status,
    origin = "—",
    destination = "—",
    checkpoints = [],
    createdAt = new Date(0).toISOString(),
    apiBaseUrl,
    incidents = [],
}: ShipmentStatusRailProps) {
    return (
        <ShipmentJourneyTimeline
            origin={origin}
            destination={destination}
            status={status}
            checkpoints={checkpoints}
            createdAt={createdAt}
            apiBaseUrl={apiBaseUrl}
            incidents={incidents}
        />
    );
}
