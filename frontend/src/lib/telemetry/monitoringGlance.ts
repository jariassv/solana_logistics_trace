import type { TelemetryEventItem } from "@/lib/api/telemetry";

export type MonitoringGlanceItem = {
    id: string;
    kind: "temperature" | "gps" | "humidity";
    label: string;
    value: string;
    recordedAt: string;
    relative: string;
};

function relativeTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60_000);
        if (mins < 1) {
            return "ahora";
        }
        if (mins < 60) {
            return `hace ${mins} min`;
        }
        const hours = Math.floor(mins / 60);
        if (hours < 48) {
            return `hace ${hours} h`;
        }
        return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch {
        return "";
    }
}

function formatTemp(celsius: number): string {
    return `${celsius.toFixed(1)} °C`;
}

function latestByType(
    items: TelemetryEventItem[],
    type: string,
): TelemetryEventItem | undefined {
    return items
        .filter((i) => i.telemetryType === type)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

/** Lecturas recientes resumidas (sin tabla). */
export function buildMonitoringGlance(items: TelemetryEventItem[]): MonitoringGlanceItem[] {
    const out: MonitoringGlanceItem[] = [];
    const temp = latestByType(items, "temperature");
    if (temp?.valueNumeric != null) {
        out.push({
            id: temp.id,
            kind: "temperature",
            label: "Temperatura",
            value: formatTemp(temp.valueNumeric),
            recordedAt: temp.recordedAt,
            relative: relativeTime(temp.recordedAt),
        });
    }
    const humidity = latestByType(items, "humidity");
    if (humidity?.valueNumeric != null) {
        out.push({
            id: humidity.id,
            kind: "humidity",
            label: "Humedad",
            value: `${humidity.valueNumeric.toFixed(0)} %`,
            recordedAt: humidity.recordedAt,
            relative: relativeTime(humidity.recordedAt),
        });
    }
    const gps = latestByType(items, "gps");
    if (gps?.latitude != null && gps.longitude != null) {
        out.push({
            id: gps.id,
            kind: "gps",
            label: "Posición",
            value: `${gps.latitude.toFixed(2)}°, ${gps.longitude.toFixed(2)}°`,
            recordedAt: gps.recordedAt,
            relative: relativeTime(gps.recordedAt),
        });
    }
    return out;
}
