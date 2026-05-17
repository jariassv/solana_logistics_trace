"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { getPublicConfig } from "@/lib/env";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function PanelShipmentDetailPage() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { apiBaseUrl } = getPublicConfig();
    const { wallet } = useWalletSession();
    const { detail, error, loading } = useShipmentDetail(apiBaseUrl, shipmentId, wallet);

    return (
        <main className="page-main">
            <div className="shell">
                <p className="text-sm mb-2">
                    <Link prefetch={false} className="btn btn--ghost btn--sm" href="/panel/envios">
                        ← Volver a envíos
                    </Link>
                </p>
                <h1 className="page-title">Detalle de envío</h1>
                <p className="page-sub mono">{shipmentId}</p>

                {!apiBaseUrl && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Configura <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                    </p>
                )}

                {apiBaseUrl && !wallet && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Conecta la wallet en el encabezado para cargar el detalle.
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
