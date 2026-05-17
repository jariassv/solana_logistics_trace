"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { CheckpointTable } from "@/components/admin/CheckpointTable";
import { CheckpointTimeline } from "@/components/panel/CheckpointTimeline";
import { shipmentCardActions } from "@/lib/admin/shipmentActions";
import { getShipmentDetail, type ShipmentDetail } from "@/lib/api/shipments";

const MapViewLazy = dynamic(
    () => import("@/components/panel/MapView").then((m) => ({ default: m.MapView })),
    {
        ssr: false,
        loading: () => (
            <div className="admin-shipment-detail__map-skeleton text-sm text-muted">
                Cargando mapa…
            </div>
        ),
    },
);

export type AdminShipmentDetailModalProps = {
    open: boolean;
    shipmentId: string | null;
    apiBaseUrl: string;
    wallet: string | null;
    role: string | null;
    programActive: boolean;
    actorOnChain: boolean;
    onClose: () => void;
    onRecordEvent: (shipmentId: string) => void;
};

export function AdminShipmentDetailModal({
    open,
    shipmentId,
    apiBaseUrl,
    wallet,
    role,
    programActive,
    actorOnChain,
    onClose,
    onRecordEvent,
}: AdminShipmentDetailModalProps) {
    const [detail, setDetail] = useState<ShipmentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!open || !shipmentId || !apiBaseUrl || !wallet) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getShipmentDetail(apiBaseUrl, shipmentId, wallet);
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
    }, [open, shipmentId, apiBaseUrl, wallet]);

    useEffect(() => {
        if (!open) {
            return;
        }
        void Promise.resolve().then(() => void load());
    }, [open, load]);

    useEffect(() => {
        if (open) {
            return;
        }
        void Promise.resolve().then(() => {
            setDetail(null);
            setError(null);
        });
    }, [open]);

    const actions = shipmentCardActions({
        role,
        hasWallet: Boolean(wallet),
        programActive,
        actorOnChain,
    });
    const recordAction = actions.find((a) => a.id === "record_event");

    const title = detail
        ? `Envío #${detail.onChainShipmentId} · ${detail.product}`
        : "Detalle de envío";

    return (
        <AdminModal open={open} title={title} onClose={onClose} size="xl">
            {!wallet ? (
                <p className="text-sm text-muted mb-0">Conecte la wallet para ver el detalle.</p>
            ) : loading ? (
                <p className="text-sm text-muted mb-0">Cargando información…</p>
            ) : error ? (
                <p className="text-sm mb-0" role="alert">
                    {error}
                </p>
            ) : detail ? (
                <div className="admin-shipment-detail">
                    <div className="admin-shipment-detail__summary card">
                        <div className="card__bd text-sm admin-shipment-detail__grid">
                            <div>
                                <span className="text-muted">Estado</span>
                                <p className="mb-0">{detail.status}</p>
                            </div>
                            <div>
                                <span className="text-muted">On-chain ID</span>
                                <p className="mb-0 mono">{detail.onChainShipmentId}</p>
                            </div>
                            <div>
                                <span className="text-muted">Origen</span>
                                <p className="mb-0">{detail.origin}</p>
                            </div>
                            <div>
                                <span className="text-muted">Destino</span>
                                <p className="mb-0">{detail.destination}</p>
                            </div>
                            <div>
                                <span className="text-muted">Remitente</span>
                                <p className="mb-0 mono text-xs break-all">{detail.sender}</p>
                            </div>
                            <div>
                                <span className="text-muted">Destinatario</span>
                                <p className="mb-0 mono text-xs break-all">{detail.recipient}</p>
                            </div>
                            <div>
                                <span className="text-muted">Cadena de frío</span>
                                <p className="mb-0">{detail.requiresColdChain ? "Sí" : "No"}</p>
                            </div>
                            <div>
                                <span className="text-muted">Checkpoints</span>
                                <p className="mb-0">{detail.checkpointCount}</p>
                            </div>
                            <div>
                                <span className="text-muted">Creado</span>
                                <p className="mb-0">
                                    <time dateTime={detail.createdAt}>{detail.createdAt}</time>
                                </p>
                            </div>
                            {detail.deliveredAt ? (
                                <div>
                                    <span className="text-muted">Entregado</span>
                                    <p className="mb-0">
                                        <time dateTime={detail.deliveredAt}>
                                            {detail.deliveredAt}
                                        </time>
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="admin-shipment-detail__split">
                        <section className="admin-shipment-detail__section">
                            <h3 className="admin-shipment-detail__section-title">Registros</h3>
                            <CheckpointTable checkpoints={detail.checkpoints} />
                        </section>
                        <section className="admin-shipment-detail__section">
                            <h3 className="admin-shipment-detail__section-title">Línea de tiempo</h3>
                            <CheckpointTimeline checkpoints={detail.checkpoints} />
                        </section>
                    </div>

                    <section className="admin-shipment-detail__section">
                        <h3 className="admin-shipment-detail__section-title">Puntos en el mapa</h3>
                        <div className="admin-shipment-detail__map">
                            <MapViewLazy checkpoints={detail.checkpoints} />
                        </div>
                    </section>

                    <footer className="admin-shipment-detail__footer">
                        <button type="button" className="btn btn--ghost" onClick={onClose}>
                            Cerrar
                        </button>
                        {shipmentId && recordAction ? (
                            <button
                                type="button"
                                className="btn btn--primary"
                                disabled={!recordAction.enabled}
                                title={recordAction.reason}
                                onClick={() => onRecordEvent(shipmentId)}
                            >
                                Registrar evento
                            </button>
                        ) : null}
                    </footer>
                </div>
            ) : (
                <p className="text-sm text-muted mb-0">Sin datos.</p>
            )}
        </AdminModal>
    );
}
