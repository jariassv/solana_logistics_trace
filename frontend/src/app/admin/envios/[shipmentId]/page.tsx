"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminModal } from "@/components/admin/AdminModal";
import { IncidentHubNavLink } from "@/components/incidents/IncidentHubNavLink";
import { RecordCheckpointForm } from "@/components/admin/RecordCheckpointForm";
import { ReportCriticalIncidentForm } from "@/components/admin/ReportCriticalIncidentForm";
import { AssignCarrierForm } from "@/components/shipments/AssignCarrierForm";
import { ShipmentDetailWorkspace } from "@/components/shipments/ShipmentDetailWorkspace";
import { canAssignCarrierAction, canRecordCheckpointAction } from "@/lib/admin/shipmentActions";
import { canReportCriticalIncidentAction } from "@/lib/admin/incidentActions";
import type { IncidentItem } from "@/lib/api/incidents";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { useAdminState } from "@/lib/admin/useAdminState";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function AdminShipmentDetailPage() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { wallet, role, actorLoading, refreshActor } = useWalletSession();
    const {
        cfg,
        programId,
        connection,
        payer,
        actorOnChain,
        refreshAll,
        resolveShipmentPda,
    } = useAdminState();

    const { detail, error, loading, reload } = useShipmentDetail(
        cfg.apiBaseUrl,
        shipmentId,
        wallet,
    );
    const [recordOpen, setRecordOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [anchorIncident, setAnchorIncident] = useState<IncidentItem | null>(null);

    const shipmentPda = useMemo(() => {
        if (!detail) {
            return null;
        }
        return resolveShipmentPda(detail.onChainShipmentId);
    }, [detail, resolveShipmentPda]);

    const recordGate = canRecordCheckpointAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
        shipmentStatus: detail?.status,
        carrierWallet: detail?.carrier,
        viewerWallet: wallet,
    });

    const reportGate = canReportCriticalIncidentAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
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

    const onRecordSuccess = useCallback(async () => {
        await refreshAll();
        await refreshActor();
        await reload();
        setRecordOpen(false);
    }, [refreshAll, refreshActor, reload]);

    const onReportSuccess = useCallback(async () => {
        await refreshAll();
        await reload();
        setReportOpen(false);
        setAnchorIncident(null);
    }, [refreshAll, reload]);

    const onAssignSuccess = useCallback(async () => {
        await refreshAll();
        await reload();
        setAssignOpen(false);
    }, [refreshAll, reload]);

    const openReportModal = useCallback((incident: IncidentItem | null) => {
        setAnchorIncident(incident);
        setReportOpen(true);
    }, []);

    const backLink = (
        <p className="admin-detail-back mb-0">
            <Link prefetch={false} className="btn btn--ghost btn--sm" href="/admin">
                ← Administración
            </Link>
            <IncidentHubNavLink />
        </p>
    );

    const headerActions = detail ? (
        <div className="admin-detail-actions">
            <button
                type="button"
                className="btn btn--primary btn--sm"
                title={recordGate.reason}
                aria-disabled={!recordGate.enabled}
                onClick={() => setRecordOpen(true)}
            >
                Registrar evento
            </button>
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
                className="btn btn--ghost btn--sm"
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
        <div className="admin-workspace admin-workspace--detail">
            {!cfg.apiBaseUrl?.trim() && (
                <p className="text-muted text-sm" role="status">
                    Configure <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                </p>
            )}

            {!wallet && (
                <p className="text-muted text-sm" role="status">
                    Conecte la wallet en el encabezado para ver el detalle.
                </p>
            )}

            {loading && <p className="text-muted text-sm">Cargando…</p>}
            {error && (
                <p className="text-sm" role="alert">
                    {error}
                </p>
            )}

            {detail && cfg.apiBaseUrl?.trim() ? (
                <ShipmentDetailWorkspace
                    detail={detail}
                    apiBaseUrl={cfg.apiBaseUrl}
                    wallet={wallet}
                    role={role}
                    onDetailReload={() => void reload()}
                    headerActions={headerActions}
                    showCheckpointTable
                    backLink={backLink}
                    canAnchorIncidentOnChain={reportGate.enabled}
                    onAnchorIncidentOnChain={(inc) => openReportModal(inc)}
                />
            ) : null}

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
                        apiBaseUrl={cfg.apiBaseUrl}
                        onSuccess={() => void onAssignSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0" role="status">
                        {!programId
                            ? "Configure NEXT_PUBLIC_PROGRAM_ID en el despliegue."
                            : !payer
                              ? "Conecte la wallet para firmar la transacción."
                              : "No se puede asignar en este momento."}
                    </p>
                )}
            </AdminModal>

            <AdminModal
                open={recordOpen}
                title="Evento logístico"
                onClose={() => setRecordOpen(false)}
                size="lg"
            >
                {!recordGate.enabled ? (
                    <p className="text-sm mb-0" role="status">
                        {recordGate.reason ?? "No puede registrar eventos con su rol o perfil actual."}
                    </p>
                ) : programId && payer && wallet && detail && shipmentPda ? (
                    <RecordCheckpointForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        shipmentPda={shipmentPda}
                        onChainShipmentId={detail.onChainShipmentId}
                        shipmentServiceId={detail.shipmentId}
                        shipmentEndpoints={{
                            origin: detail.origin,
                            destination: detail.destination,
                        }}
                        apiBaseUrl={cfg.apiBaseUrl}
                        wallet={wallet}
                        role={role}
                        onSuccess={() => void onRecordSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0" role="status">
                        {!programId
                            ? "Configure NEXT_PUBLIC_PROGRAM_ID en el despliegue."
                            : !payer
                              ? "Conecte la wallet para firmar la transacción."
                              : !detail
                                ? "Cargando datos del envío…"
                                : !shipmentPda
                                  ? `No se pudo resolver la cuenta del envío on-chain (#${detail.onChainShipmentId}).`
                                  : "No se puede registrar el evento en este momento."}
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
                        apiBaseUrl={cfg.apiBaseUrl}
                        anchorIncident={anchorIncident}
                        onSuccess={() => void onReportSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0" role="status">
                        {!programId
                            ? "Configure NEXT_PUBLIC_PROGRAM_ID en el despliegue."
                            : !payer
                              ? "Conecte la wallet para firmar la transacción."
                              : "No se puede reportar en este momento."}
                    </p>
                )}
            </AdminModal>
        </div>
    );
}
