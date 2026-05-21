"use client";

import { IconRadio, IconThermometer, IconTruck } from "@/components/ui/TraceIcons";
import type { TelemetryEventItem } from "@/lib/api/telemetry";
import { buildMonitoringGlance } from "@/lib/telemetry/monitoringGlance";

export type ShipmentMonitoringGlanceProps = {
    items: TelemetryEventItem[];
    loading: boolean;
    requiresColdChain: boolean;
};

function GlanceIcon({ kind }: { kind: "temperature" | "gps" | "humidity" }) {
    switch (kind) {
        case "temperature":
            return <IconThermometer className="trace-icon" />;
        case "humidity":
            return <IconRadio className="trace-icon" />;
        case "gps":
            return <IconTruck className="trace-icon" />;
    }
}

export function ShipmentMonitoringGlance({
    items,
    loading,
    requiresColdChain,
}: ShipmentMonitoringGlanceProps) {
    const glance = buildMonitoringGlance(items);

    if (loading) {
        return (
            <p className="shipment-monitor__hint text-sm text-muted mb-0" role="status">
                Sincronizando sensores…
            </p>
        );
    }

    if (glance.length === 0) {
        if (!requiresColdChain) {
            return null;
        }
        return (
            <p className="shipment-monitor__hint text-sm text-muted mb-0" role="status">
                Monitoreo activo; aún no hay lecturas de temperatura en este envío.
            </p>
        );
    }

    return (
        <ul className="shipment-monitor" aria-label="Últimas lecturas de sensores">
            {glance.map((g) => (
                <li key={g.id} className={`shipment-monitor__chip shipment-monitor__chip--${g.kind}`}>
                    <span className="shipment-monitor__chip-icon" aria-hidden>
                        <GlanceIcon kind={g.kind} />
                    </span>
                    <span className="shipment-monitor__chip-body">
                        <span className="shipment-monitor__chip-label">{g.label}</span>
                        <span className="shipment-monitor__chip-value">{g.value}</span>
                        <span className="shipment-monitor__chip-time">{g.relative}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}
