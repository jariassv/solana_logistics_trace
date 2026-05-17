"use client";

import dynamic from "next/dynamic";

import { CheckpointTable } from "@/components/admin/CheckpointTable";
import { CheckpointTimeline } from "@/components/panel/CheckpointTimeline";
import { statusBadgeClass } from "@/lib/admin/shipmentActions";
import type { ShipmentDetail } from "@/lib/api/shipments";

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

export type AdminShipmentDetailViewProps = {
    detail: ShipmentDetail;
    canRecordEvent: boolean;
    recordDisabledReason?: string;
    onRecordEvent: () => void;
};

export function AdminShipmentDetailView({
    detail,
    canRecordEvent,
    recordDisabledReason,
    onRecordEvent,
}: AdminShipmentDetailViewProps) {
    return (
        <div className="admin-shipment-detail">
            <div className="admin-shipment-detail__summary card">
                <div className="card__hd">Resumen</div>
                <div className="card__bd text-sm admin-shipment-detail__grid">
                    <div>
                        <span className="text-muted">Estado</span>
                        <p className="mb-0">
                            <span className={statusBadgeClass(detail.status)}>{detail.status}</span>
                        </p>
                    </div>
                    <div>
                        <span className="text-muted">On-chain ID</span>
                        <p className="mb-0 mono">{detail.onChainShipmentId}</p>
                    </div>
                    <div>
                        <span className="text-muted">Producto</span>
                        <p className="mb-0">{detail.product}</p>
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
                                <time dateTime={detail.deliveredAt}>{detail.deliveredAt}</time>
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="layout-split layout-split--2-1 admin-shipment-detail__main mt-2">
                <div>
                    <div className="card">
                        <div className="card__hd">Registros (tabla)</div>
                        <div className="card__bd">
                            <CheckpointTable checkpoints={detail.checkpoints} />
                        </div>
                    </div>
                    <div className="card mt-2">
                        <div className="card__hd">Línea de tiempo</div>
                        <div className="card__bd">
                            <CheckpointTimeline checkpoints={detail.checkpoints} />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="card admin-shipment-detail__map-card">
                        <div className="card__hd">Mapa de puntos</div>
                        <div className="card__bd admin-shipment-detail__map">
                            <MapViewLazy checkpoints={detail.checkpoints} />
                        </div>
                    </div>
                </div>
            </div>

            <footer className="admin-shipment-detail__footer">
                <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!canRecordEvent}
                    title={recordDisabledReason}
                    onClick={onRecordEvent}
                >
                    Registrar evento
                </button>
            </footer>
        </div>
    );
}
