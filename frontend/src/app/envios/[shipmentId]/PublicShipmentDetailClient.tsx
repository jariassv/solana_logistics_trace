"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { ShipmentStatusRail } from "@/components/public/ShipmentStatusRail";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { getPublicConfig } from "@/lib/env";

export function PublicShipmentDetailClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const wallet = searchParams.get("wallet")?.trim() ?? "";
    const { apiBaseUrl } = getPublicConfig();
    const { detail, error, loading } = useShipmentDetail(apiBaseUrl, shipmentId, wallet || null);

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
                    <div className="mt-2">
                        <ShipmentDetailView
                            detail={detail}
                            lead={
                                <div className="card">
                                    <div className="card__hd">Etapas del envío</div>
                                    <div className="card__bd">
                                        <ShipmentStatusRail status={detail.status} />
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
