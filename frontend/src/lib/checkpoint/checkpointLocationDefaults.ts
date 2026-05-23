import type { LocationCatalogItem } from "@/lib/api/locations";
import type { GeoPoint } from "@/lib/geo/geoPoint";
import { parseCoordEndpoint } from "@/lib/shipments/journeyTimeline";
import { resolveEndpointDisplay } from "@/lib/shipments/locationEndpoint";
import type { MeterSnapshot } from "@/lib/telemetry/meterSnapshot";

export type ShipmentRouteEndpoints = {
    origin: string;
    destination: string;
};

export type CheckpointLocationDefaults = {
    location: string;
    coordinates: GeoPoint | null;
};

export function endpointToGeoPoint(raw: string): GeoPoint | null {
    const parsed = parseCoordEndpoint(raw.trim());
    if (parsed.lat == null || parsed.lng == null) {
        return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
}

function formatLocationLine(prefix: string, display: { title: string; subtitle: string | null }): string {
    if (display.subtitle) {
        return `${prefix} — ${display.title} (${display.subtitle})`;
    }
    return `${prefix} — ${display.title}`;
}

/**
 * Lugar y coordenadas sugeridos según tipo de evento y ruta del envío.
 * Prioriza posición actual (telemetría) en tránsito; recogida/entrega en extremos.
 */
export function resolveCheckpointLocationDefaults(
    checkpointType: string,
    route: ShipmentRouteEndpoints,
    catalog: readonly LocationCatalogItem[],
    meterSnapshot?: MeterSnapshot | null,
): CheckpointLocationDefaults {
    const originDisplay = resolveEndpointDisplay(route.origin, catalog);
    const destinationDisplay = resolveEndpointDisplay(route.destination, catalog);
    const originCoords = endpointToGeoPoint(route.origin);
    const destinationCoords = endpointToGeoPoint(route.destination);
    const meterCoords = meterSnapshot?.coordinates ?? null;

    switch (checkpointType) {
        case "Pickup":
            return {
                location: formatLocationLine("Recogida", originDisplay),
                coordinates: originCoords ?? meterCoords,
            };
        case "Delivered":
            return {
                location: formatLocationLine("Entrega", destinationDisplay),
                coordinates: destinationCoords ?? meterCoords,
            };
        case "DeliveryAttempt":
            return {
                location: formatLocationLine("Intento de entrega", destinationDisplay),
                coordinates: destinationCoords ?? meterCoords,
            };
        case "HubIn":
            return {
                location: formatLocationLine("Entrada a hub", originDisplay),
                coordinates: meterCoords ?? originCoords,
            };
        case "HubOut":
            return {
                location: formatLocationLine("Salida de hub", originDisplay),
                coordinates: meterCoords ?? originCoords,
            };
        case "Transit":
        case "SensorData":
            return {
                location:
                    meterCoords != null
                        ? formatLocationLine("En tránsito", originDisplay)
                        : formatLocationLine("En tránsito hacia destino", destinationDisplay),
                coordinates: meterCoords ?? originCoords ?? destinationCoords,
            };
        default:
            return {
                location: originDisplay.title,
                coordinates: meterCoords ?? originCoords,
            };
    }
}

/** Si el tipo de evento fija el lugar por ruta, no sobrescribir con GPS del medidor. */
export function shouldPreserveRouteOnMeterSample(checkpointType: string): boolean {
    return checkpointType === "Pickup" || checkpointType === "Delivered";
}
