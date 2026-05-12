"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { CheckpointTimeline } from "@/components/panel/CheckpointTimeline";
import { ShipmentStatusRail } from "@/components/public/ShipmentStatusRail";
import { getShipmentDetail, type ShipmentDetail } from "@/lib/api/shipments";
import { getPublicConfig } from "@/lib/env";

const MapViewLazy = dynamic(
    () => import("@/components/panel/MapView").then((m) => ({ default: m.MapView })),
    {
        ssr: false,
        loading: () => (
            <div className="panel-etapa2-map-skeleton text-sm text-muted" data-testid="map-skeleton">
                Cargando mapa…
            </div>
        ),
    },
);

export function PublicShipmentDetailClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const wallet = searchParams.get("wallet")?.trim() ?? "";
    const { apiBaseUrl } = getPublicConfig();
    const [detail, setDetail] = useState<ShipmentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!apiBaseUrl || !wallet || !shipmentId) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentDetail(apiBaseUrl, shipmentId, wallet);
            if (!res.ok) {
                setDetail(null);
                setError(`HTTP ${res.status}`);
                return;
            }
            setDetail(res.data);
        } catch (e) {
            setDetail(null);
            setError(e instanceof Error ? e.message : "Error de red");
        } finally {
            setLoading(false);
        }
    }, [apiBaseUrl, shipmentId, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void load());
    }, [load]);

    return (
        <main className="page-main">
            <div className="shell">
                <p className="text-sm mb-2">
                    <Link prefetch={false} className="btn btn--ghost btn--sm" href="/envios">
                        ← Volver a consulta
                    </Link>
                </p>
                <h1 className="page-title">Detalle de envío</h1>
                <p className="page-sub mono">{shipmentId}</p>

                {!apiBaseUrl && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Configure <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                    </p>
                )}

                {apiBaseUrl && (!wallet || !shipmentId) && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Falta el parámetro <code className="mono">wallet</code> en la URL (wallet
                        participante). Use el formulario &quot;Por ID&quot; en{" "}
                        <Link prefetch={false} href="/envios">
                            /envios
                        </Link>
                        .
                    </p>
                )}

                {loading && <p className="text-muted text-sm mt-2">Cargando…</p>}
                {error && (
                    <p className="text-sm mt-2" role="alert">
                        {error}
                    </p>
                )}

                {detail && (
                    <div className="mt-2 space-y-2">
                        <div className="card">
                            <div className="card__hd">Etapas del envío</div>
                            <div className="card__bd">
                                <ShipmentStatusRail status={detail.status} />
                            </div>
                        </div>
                        <div className="layout-split layout-split--2-1">
                            <div>
                                <div className="card">
                                    <div className="card__hd">Resumen</div>
                                    <div className="card__bd text-sm space-y-2">
                                        <p>
                                            <strong>Estado:</strong> {detail.status}
                                        </p>
                                        <p>
                                            <strong>Producto:</strong> {detail.product}
                                        </p>
                                        <p>
                                            <strong>Origen → destino:</strong> {detail.origin} →{" "}
                                            {detail.destination}
                                        </p>
                                        <p className="mono text-xs break-all">
                                            <strong>Remitente:</strong> {detail.sender}
                                        </p>
                                        <p className="mono text-xs break-all">
                                            <strong>Destinatario:</strong> {detail.recipient}
                                        </p>
                                    </div>
                                </div>
                                <div className="card mt-2">
                                    <div className="card__hd">Checkpoints</div>
                                    <div className="card__bd">
                                        <CheckpointTimeline checkpoints={detail.checkpoints} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="card">
                                    <div className="card__hd">Mapa</div>
                                    <div className="card__bd">
                                        <MapViewLazy checkpoints={detail.checkpoints} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
