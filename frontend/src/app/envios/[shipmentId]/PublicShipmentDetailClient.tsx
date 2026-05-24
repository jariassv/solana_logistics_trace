"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { ShipmentStatusRail } from "@/components/public/ShipmentStatusRail";
import { usePublicShipmentDetail } from "@/lib/api/usePublicShipmentDetail";
import { isShipmentServiceUuid } from "@/lib/api/publicShipments";
import { getPublicConfig } from "@/lib/env";

export function PublicShipmentDetailClient() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { apiBaseUrl } = getPublicConfig();
    const validId = isShipmentServiceUuid(shipmentId) ? shipmentId : "";
    const { detail, error, loading } = usePublicShipmentDetail(apiBaseUrl, validId);

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

                {apiBaseUrl && shipmentId && !validId && (
                    <p className="text-sm mt-2" role="alert">
                        El identificador en la URL no es un UUID de servicio válido.{" "}
                        <Link prefetch={false} href="/envios">
                            Vuelva a buscar
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
                    <div className="mt-2">
                        <ShipmentDetailView
                            detail={detail}
                            apiBaseUrl={apiBaseUrl}
                            lead={
                                <div className="card">
                                    <div className="card__bd">
                                        <ShipmentStatusRail
                                            status={detail.status}
                                            origin={detail.origin}
                                            destination={detail.destination}
                                            checkpoints={detail.checkpoints}
                                            createdAt={detail.createdAt}
                                            apiBaseUrl={apiBaseUrl}
                                            incidents={detail.incidents}
                                        />
                                    </div>
                                </div>
                            }
                            summaryVariant="prose"
                            showTimeline
                            showMap
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
