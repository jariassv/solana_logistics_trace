"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminShipmentDetailView } from "@/components/admin/AdminShipmentDetailView";
import { RecordCheckpointForm } from "@/components/admin/RecordCheckpointForm";
import { shipmentCardActions } from "@/lib/admin/shipmentActions";
import { getShipmentDetail, type ShipmentDetail } from "@/lib/api/shipments";
import { useAdminState } from "@/lib/admin/useAdminState";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function AdminShipmentDetailPage() {
    const params = useParams();
    const shipmentId = typeof params?.shipmentId === "string" ? params.shipmentId : "";
    const { wallet, role, refreshActor } = useWalletSession();
    const {
        cfg,
        programId,
        connection,
        payer,
        programActive,
        actorOnChain,
        refreshAll,
        resolveShipmentPda,
    } = useAdminState();

    const [detail, setDetail] = useState<ShipmentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [recordOpen, setRecordOpen] = useState(false);

    const load = useCallback(async () => {
        if (!cfg.apiBaseUrl || !wallet || !shipmentId) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentDetail(cfg.apiBaseUrl, shipmentId, wallet);
            if (!res.ok) {
                setDetail(null);
                setError(`No se pudo cargar el detalle (HTTP ${res.status}).`);
                return;
            }
            setDetail(res.data);
        } catch (e) {
            setDetail(null);
            setError(e instanceof Error ? e.message : "Error de red");
        } finally {
            setLoading(false);
        }
    }, [cfg.apiBaseUrl, shipmentId, wallet]);

    useEffect(() => {
        void Promise.resolve().then(() => void load());
    }, [load]);

    const shipmentPda = useMemo(() => {
        if (!detail) {
            return null;
        }
        return resolveShipmentPda(detail.onChainShipmentId);
    }, [detail, resolveShipmentPda]);

    const recordAction = shipmentCardActions({
        role,
        hasWallet: Boolean(wallet),
        programActive,
        actorOnChain: actorOnChain === true,
    }).find((a) => a.id === "record_event");

    const onRecordSuccess = useCallback(async () => {
        await refreshAll();
        await refreshActor();
        await load();
        setRecordOpen(false);
    }, [refreshAll, refreshActor, load]);

    return (
        <>
            <p className="text-sm mb-2">
                <Link prefetch={false} className="btn btn--ghost btn--sm" href="/admin">
                    ← Volver al admin
                </Link>
            </p>
            <h1 className="page-title">Detalle de envío</h1>
            <p className="page-sub mono">{shipmentId}</p>

            {!cfg.apiBaseUrl?.trim() && (
                <p className="text-muted text-sm mt-2" role="status">
                    Configure <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                </p>
            )}

            {!wallet && (
                <p className="text-muted text-sm mt-2" role="status">
                    Conecte la wallet en el encabezado para ver el detalle.
                </p>
            )}

            {loading && <p className="text-muted text-sm mt-2">Cargando…</p>}
            {error && (
                <p className="text-sm mt-2" role="alert">
                    {error}
                </p>
            )}

            {detail && (
                <AdminShipmentDetailView
                    detail={detail}
                    canRecordEvent={Boolean(recordAction?.enabled)}
                    recordDisabledReason={recordAction?.reason}
                    onRecordEvent={() => setRecordOpen(true)}
                />
            )}

            <AdminModal
                open={recordOpen}
                title="Evento logístico"
                onClose={() => setRecordOpen(false)}
                size="lg"
            >
                {programId && payer && detail && shipmentPda ? (
                    <RecordCheckpointForm
                        connection={connection}
                        programId={programId}
                        payer={payer}
                        shipmentPda={shipmentPda}
                        onChainShipmentId={detail.onChainShipmentId}
                        apiBaseUrl={cfg.apiBaseUrl}
                        onSuccess={() => void onRecordSuccess()}
                    />
                ) : (
                    <p className="text-sm text-muted mb-0">
                        No se puede registrar el evento en este momento.
                    </p>
                )}
            </AdminModal>
        </>
    );
}
