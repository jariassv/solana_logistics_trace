/** Etiquetas y estilos para incidencias en UI. */

export function incidentSeverityLabel(severity: string): string {
    switch (severity) {
        case "Critical":
            return "Crítica";
        case "High":
            return "Alta";
        case "Medium":
            return "Media";
        case "Low":
            return "Baja";
        default:
            return severity;
    }
}

export function incidentSeverityClass(severity: string): string {
    const base = "badge ";
    switch (severity) {
        case "Critical":
            return `${base}badge--danger`;
        case "High":
            return `${base}badge--warn`;
        case "Medium":
            return `${base}badge--info`;
        case "Low":
            return `${base}badge--muted`;
        default:
            return `${base}badge--muted`;
    }
}

export function incidentSourceLabel(source: string): string {
    switch (source) {
        case "auto":
            return "Detección automática";
        case "on_chain":
            return "Reporte firmado on-chain";
        case "manual_offchain":
            return "Manual off-chain";
        default:
            return source;
    }
}

export function incidentTypeLabel(code: string): string {
    const map: Record<string, string> = {
        COLD_CHAIN_BROKEN: "Ruptura cadena de frío",
        SHIPMENT_DELAYED: "Envío retrasado",
        ROUTE_DEVIATION: "Desviación de ruta",
        SENSOR_OFFLINE: "Sensor sin datos",
        CRITICAL_MANUAL: "Incidencia crítica",
        TempViolation: "Violación de temperatura",
        Damage: "Daño",
        Delay: "Retraso",
        Lost: "Pérdida",
        Unauthorized: "No autorizado",
        Other: "Otro",
    };
    return map[code] ?? code;
}
