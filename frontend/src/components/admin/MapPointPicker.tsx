"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import type { GeoPoint } from "@/lib/geo/geoPoint";

import "leaflet/dist/leaflet.css";

/** Centro por defecto (España peninsular). */
const DEFAULT_CENTER: GeoPoint = { lat: 40.4168, lng: -3.7038 };
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 12;

function ensureLeafletIcons(): void {
    const proto = L.Icon.Default.prototype as L.Icon.Default & {
        _getIconUrl?: unknown;
    };
    delete proto._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
}

function MapClickHandler({ onPick }: { onPick: (p: GeoPoint) => void }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

export type MapPointPickerProps = {
    value: GeoPoint | null;
    onChange: (p: GeoPoint) => void;
    /** Etiqueta accesible del mapa. */
    ariaLabel: string;
};

export function MapPointPicker({ value, onChange, ariaLabel }: MapPointPickerProps) {
    useEffect(() => {
        ensureLeafletIcons();
    }, []);

    const center = useMemo(() => value ?? DEFAULT_CENTER, [value]);
    const zoom = value ? SELECTED_ZOOM : DEFAULT_ZOOM;
    const mapKey = value
        ? `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`
        : "default";

    return (
        <div className="geo-map-picker" data-testid="geo-map-picker">
            <p className="text-xs text-muted mb-1">Haga clic en el mapa para fijar el punto.</p>
            <MapContainer
                key={mapKey}
                center={[center.lat, center.lng]}
                zoom={zoom}
                className="geo-map-picker__canvas"
                scrollWheelZoom
                aria-label={ariaLabel}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={onChange} />
                {value ? <Marker position={[value.lat, value.lng]} /> : null}
            </MapContainer>
            {value ? (
                <p className="text-xs mono text-muted mt-1 mb-0">
                    {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                </p>
            ) : null}
        </div>
    );
}
