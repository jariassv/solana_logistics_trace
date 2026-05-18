"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminModal } from "@/components/admin/AdminModal";
import { ReportCriticalIncidentForm } from "@/components/admin/ReportCriticalIncidentForm";
import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { ShipmentIncidentsSection } from "@/components/shipments/ShipmentIncidentsSection";
import { canReportCriticalIncidentAction } from "@/lib/admin/incidentActions";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { getPublicConfig } from "@/lib/env";
import { useAdminState } from "@/lib/admin/useAdminState";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function PanelShipmentDetailPage() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { apiBaseUrl } = getPublicConfig();
    const { wallet, role, actorLoading } = useWalletSession();
    const { detail, error, loading, reload } = useShipmentDetail(apiBaseUrl, shipmentId, wallet);
    const { programId, connection, payer, actorOnChain, resolveShipmentPda } = useAdminState();
    const [reportOpen, setReportOpen] = useState(false);

    const shipmentPda = useMemo(() => {
        if (!detail) {
            return null;
        }
        return resolveShipmentPda(detail.onChainShipmentId);
    }, [detail, resolveShipmentPda]);

    const reportGate = canReportCriticalIncidentAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
    });

    const onReportSuccess = useCallback(async () => {
        await reload();
        setReportOpen(false);
    }, [reload]);

    const reportButton =
        wallet && detail ? (
            <button
                type="button"
                className="btn btn--primary btn--sm"
                title={reportGate.reason}
                aria-disabled={!reportGate.enabled}
                onClick={() => setReportOpen(true)}
            >
                Reportar crítica
            </button>
        ) : null;

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
                        {apiBaseUrl && (
                            <ShipmentIncidentsSection
                                apiBaseUrl={apiBaseUrl}
                                shipmentId={shipmentId}
                                wallet={wallet}
                                headerAction={reportButton}
                            />
                        )}
                    </div>
                )}
            </div>

            <AdminModal
                open={reportOpen}
                title="Incidencia crítica on-chain"
                onClose={() => setReportOpen(false)}
                size="lg"
            >
                {!reportGate.enabled ? (
                    <p className="text-sm mb-0" role="status">
                        {reportGate.reason ?? "No puede reportar con su rol o perfil actual."}
                    </p>
                ) : programId && payer && detail && shipmentPda ? (
                    <ReportCriticalIncidentForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        shipmentPda={shipmentPda}
                        shipmentServiceId={detail.shipmentId}
                        apiBaseUrl={apiBaseUrl}
                        onSuccess={() => void onReportSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0" role="status">
                        {!programId
                            ? "Configure NEXT_PUBLIC_PROGRAM_ID."
                            : !payer
                              ? "Conecte la wallet para firmar."
                              : "No se puede reportar en este momento."}
                    </p>
                )}
            </AdminModal>
        </main>
    );
}
