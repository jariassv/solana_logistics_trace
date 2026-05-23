"use client";

import dynamic from "next/dynamic";

import { useLocationsCatalog } from "@/lib/api/useLocationsCatalog";
import { resolveEndpointDisplay } from "@/lib/shipments/locationEndpoint";
import { resolveJourneyRoutePoints } from "@/lib/shipments/journeyRouteMap";

function mapWrapClass(variant: ShipmentRecorridoAsideProps["variant"]): string {
    return variant === "public" ? "shipment-detail__map" : "shipment-detail-pro__map";
}

function journeyRouteMapLazy(skeletonClass: string) {
    return dynamic(
        () =>
            import("@/components/shipments/JourneyRouteMap").then((m) => ({
                default: m.JourneyRouteMap,
            })),
        {
            ssr: false,
            loading: () => (
                <div className={`${skeletonClass} text-sm text-muted`} role="status">
                    Cargando mapa…
                </div>
            ),
        },
    );
}

const JourneyRouteMapProLazy = journeyRouteMapLazy("shipment-detail-pro__map-skeleton");
const JourneyRouteMapPublicLazy = journeyRouteMapLazy("shipment-detail__map-skeleton");

export type ShipmentRecorridoAsideProps = {
    origin: string;
    destination: string;
    apiBaseUrl?: string;
    /** `pro` = panel detalle; `public` = consulta pública `/envios`. */
    variant?: "pro" | "public";
};

/** Mapa origen/destino (tarjeta Recorrido del panel o sección Mapa de consulta pública). */
export function ShipmentRecorridoAside({
    origin,
    destination,
    apiBaseUrl,
    variant = "pro",
}: ShipmentRecorridoAsideProps) {
    const { items: locationCatalog } = useLocationsCatalog(apiBaseUrl);
    const originDisplay = resolveEndpointDisplay(origin, locationCatalog);
    const destinationDisplay = resolveEndpointDisplay(destination, locationCatalog);
    const routePoints = resolveJourneyRoutePoints(
        origin,
        destination,
        locationCatalog,
        originDisplay.title,
        destinationDisplay.title,
    );
    const JourneyRouteMapLazy =
        variant === "public" ? JourneyRouteMapPublicLazy : JourneyRouteMapProLazy;

    return (
        <div className={mapWrapClass(variant)}>
            <JourneyRouteMapLazy points={routePoints} placement="aside" />
        </div>
    );
}
