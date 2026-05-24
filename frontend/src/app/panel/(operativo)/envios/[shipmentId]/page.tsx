"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminModal } from "@/components/admin/AdminModal";
import { IncidentHubNavLink } from "@/components/incidents/IncidentHubNavLink";
import { ReportCriticalIncidentForm } from "@/components/admin/ReportCriticalIncidentForm";
import { AssignCarrierForm } from "@/components/shipments/AssignCarrierForm";
import { ShipmentDetailWorkspace } from "@/components/shipments/ShipmentDetailWorkspace";
import { canAssignCarrierAction } from "@/lib/admin/shipmentActions";
import { canReportCriticalIncidentAction } from "@/lib/admin/incidentActions";
import type { IncidentItem } from "@/lib/api/incidents";
import { useShipmentIncidents } from "@/lib/api/useShipmentIncidents";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { shipmentHasRegisteredLoss } from "@/lib/incidents/criticalIncidentFlow";
import { getPublicConfig } from "@/lib/env";
import { useAdminState } from "@/lib/admin/useAdminState";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function PanelShipmentDetailPage() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { apiBaseUrl } = getPublicConfig();
    const { wallet, role, actorLoading } = useWalletSession();
    const { detail, error, loading, reload } = useShipmentDetail(apiBaseUrl, shipmentId, wallet);
    const { items: incidents } = useShipmentIncidents(apiBaseUrl, shipmentId, wallet);
    const { programId, connection, payer, actorOnChain, resolveShipmentPda } = useAdminState();
    const [reportOpen, setReportOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [anchorIncident, setAnchorIncident] = useState<IncidentItem | null>(null);

    const shipmentPda = useMemo(() => {
        if (!detail) {
            return null;
        }
        return resolveShipmentPda(detail.onChainShipmentId);
    }, [detail, resolveShipmentPda]);

    const hasRegisteredLoss = useMemo(
        () => (detail ? shipmentHasRegisteredLoss(detail.status, incidents) : false),
        [detail, incidents],
    );

    const reportGate = canReportCriticalIncidentAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
        hasRegisteredLoss,
    });

    const assignGate = canAssignCarrierAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
        senderWallet: detail?.sender ?? "",
        viewerWallet: wallet,
        carrierWallet: detail?.carrier,
        shipmentStatus: detail?.status ?? "",
    });

    const onReportSuccess = useCallback(async () => {
        await reload();
        setReportOpen(false);
        setAnchorIncident(null);
    }, [reload]);

    const onAssignSuccess = useCallback(async () => {
        await reload();
        setAssignOpen(false);
    }, [reload]);

    const openReportModal = useCallback((incident: IncidentItem | null) => {
        setAnchorIncident(incident);
        setReportOpen(true);
    }, []);

    const backLink = (
        <p className="admin-detail-back mb-0">
            <Link prefetch={false} className="btn btn--ghost btn--sm" href="/panel/envios">
                ← Envíos
            </Link>
            <IncidentHubNavLink />
        </p>
    );

    const headerActions =
        wallet && detail ? (
            <div className="admin-detail-actions">
                {assignGate.enabled || role === "Sender" ? (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        title={assignGate.reason}
                        aria-disabled={!assignGate.enabled}
                        disabled={!assignGate.enabled}
                        onClick={() => setAssignOpen(true)}
                    >
                        Asignar transportista
                    </button>
                ) : null}
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    title={reportGate.reason}
                    aria-disabled={!reportGate.enabled}
                    disabled={!reportGate.enabled}
                    onClick={() => openReportModal(null)}
                >
                    Reportar crítica
                </button>
            </div>
        ) : null;

    return (
        <main className="page-main">
            <div className="shell shell--wide">
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

                {detail && apiBaseUrl && (
                    <ShipmentDetailWorkspace
                        detail={detail}
                        apiBaseUrl={apiBaseUrl}
                        wallet={wallet}
                        role={role}
                        onDetailReload={() => void reload()}
                        headerActions={headerActions}
                        backLink={backLink}
                        canAnchorIncidentOnChain={reportGate.enabled}
                        onAnchorIncidentOnChain={(inc) => openReportModal(inc)}
                    />
                )}
            </div>

            <AdminModal
                open={assignOpen}
                title="Asignar transportista"
                onClose={() => setAssignOpen(false)}
                size="md"
            >
                {!assignGate.enabled ? (
                    <p className="text-sm mb-0" role="status">
                        {assignGate.reason ?? "No puede asignar transportista con su perfil actual."}
                    </p>
                ) : programId && payer && detail && shipmentPda ? (
                    <AssignCarrierForm
                        connection={connection}
                        programId={programId}
                        sender={payer}
                        shipmentPda={shipmentPda}
                        apiBaseUrl={apiBaseUrl}
                        onSuccess={() => void onAssignSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0" role="status">
                        {!programId
                            ? "Configure NEXT_PUBLIC_PROGRAM_ID."
                            : !payer
                              ? "Conecte la wallet para firmar."
                              : "No se puede asignar en este momento."}
                    </p>
                )}
            </AdminModal>

            <AdminModal
                open={reportOpen}
                title="Incidencia crítica on-chain"
                onClose={() => {
                    setReportOpen(false);
                    setAnchorIncident(null);
                }}
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
                        anchorIncident={anchorIncident}
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
