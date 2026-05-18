"use client";

import Link from "next/link";
import { useCallback } from "react";

import { ShipmentTracker } from "@/components/panel/ShipmentTracker";
import { useShipmentsList } from "@/lib/api/useShipmentsList";
import { canSenderRegisterShipments } from "@/lib/panel/capabilities";
import { getPublicConfig } from "@/lib/env";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function PanelEnviosPage() {
    const { apiBaseUrl } = getPublicConfig();
    const { wallet, role } = useWalletSession();
    const base = apiBaseUrl.trim() !== "" ? apiBaseUrl : undefined;
    const { rows, error, loading, reload } = useShipmentsList(base, wallet);

    const detailHref = useCallback(
        (shipmentId: string, w: string) =>
            `/panel/envios/${encodeURIComponent(shipmentId)}?wallet=${encodeURIComponent(w)}`,
        [],
    );

    const senderCta =
        canSenderRegisterShipments(role) && wallet ? (
            <Link prefetch={false} className="btn btn--primary btn--sm" href="/admin">
                Nuevo envío
            </Link>
        ) : null;

    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Envíos</h1>
                <p className="page-sub">
                    Listado según su cartera y rol (`GET /shipments` con su wallet). Detalle y mapa
                    dentro del panel.
                </p>

                {!apiBaseUrl?.trim() && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Configura <code className="mono">NEXT_PUBLIC_API_BASE_URL</code> (p. ej.{" "}
                        <span className="mono">http://127.0.0.1:8000/api/v1</span>).
                    </p>
                )}

                {apiBaseUrl?.trim() && wallet && (
                    <div className="mt-2">
                        <ShipmentTracker
                            apiBaseUrl={apiBaseUrl}
                            wallet={wallet}
                            detailHref={detailHref}
                            title="Envíos de su rol"
                            controlled={{ rows, loading, error, onReload: reload }}
                            headerActions={senderCta}
                        />
                    </div>
                )}

                {apiBaseUrl?.trim() && !wallet && (
                    <p className="text-muted text-sm mt-2" role="status">
                        Conecte la wallet con el botón superior para cargar envíos.
                    </p>
                )}
            </div>
        </main>
    );
}
