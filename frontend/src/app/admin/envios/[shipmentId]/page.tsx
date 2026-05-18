"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminModal } from "@/components/admin/AdminModal";
import { IncidentHubNavLink } from "@/components/incidents/IncidentHubNavLink";
import { RecordCheckpointForm } from "@/components/admin/RecordCheckpointForm";
import { ReportCriticalIncidentForm } from "@/components/admin/ReportCriticalIncidentForm";
import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { ShipmentIncidentsSection } from "@/components/shipments/ShipmentIncidentsSection";
import { canReportCriticalIncidentAction } from "@/lib/admin/incidentActions";
import { useShipmentDetail } from "@/lib/api/useShipmentDetail";
import { canRecordCheckpointAction } from "@/lib/admin/shipmentActions";
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
    });

    const reportGate = canReportCriticalIncidentAction({
        role,
        hasWallet: Boolean(wallet),
        programConfigured: Boolean(programId),
        actorOnChain,
        actorLoading,
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
    }, [refreshAll, reload]);

    return (
        <div className="admin-workspace admin-workspace--detail">
            <p className="admin-detail-back">
                <Link prefetch={false} className="btn btn--ghost btn--sm" href="/admin">
                    ← Volver al listado
                </Link>
                <IncidentHubNavLink />
            </p>
            <header className="admin-page-header admin-page-header--compact">
                <div className="admin-page-header__intro">
                    <h1 className="admin-page-header__title">Detalle de envío</h1>
                    <p className="admin-page-header__sub mono">{shipmentId}</p>
                </div>
            </header>

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

            {detail && (
                <>
                    <ShipmentDetailView
                        detail={detail}
                        summaryVariant="grid"
                        showCheckpointTable
                        showTimeline
                        showMap
                        summaryAction={
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
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    title={reportGate.reason}
                                    aria-disabled={!reportGate.enabled}
                                    onClick={() => setReportOpen(true)}
                                >
                                    Reportar crítica
                                </button>
                            </div>
                        }
                    />
                    {cfg.apiBaseUrl?.trim() ? (
                        <ShipmentIncidentsSection
                            apiBaseUrl={cfg.apiBaseUrl}
                            shipmentId={shipmentId}
                            wallet={wallet}
                        />
                    ) : null}
                </>
            )}

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
                ) : programId && payer && detail && shipmentPda ? (
                    <RecordCheckpointForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        shipmentPda={shipmentPda}
                        onChainShipmentId={detail.onChainShipmentId}
                        apiBaseUrl={cfg.apiBaseUrl}
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
                        apiBaseUrl={cfg.apiBaseUrl}
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
