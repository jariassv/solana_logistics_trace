"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { ShipmentOperationalDetails } from "@/components/shipments/ShipmentOperationalDetails";
import { CheckpointTable } from "@/components/shipments/CheckpointTable";
import { CheckpointTimeline } from "@/components/panel/CheckpointTimeline";
import { statusBadgeClass } from "@/lib/shipments/display";
import type { ShipmentDetail } from "@/lib/api/shipments";

const MapViewLazy = dynamic(
    () => import("@/components/panel/MapView").then((m) => ({ default: m.MapView })),
    {
        ssr: false,
        loading: () => (
            <div className="shipment-detail__map-skeleton text-sm text-muted">
                Cargando mapa…
            </div>
        ),
    },
);

export type ShipmentDetailViewProps = {
    detail: ShipmentDetail;
    lead?: ReactNode;
    summaryVariant?: "grid" | "prose";
    showCheckpointTable?: boolean;
    showTimeline?: boolean;
    showMap?: boolean;
    summaryAction?: ReactNode;
    className?: string;
};

function SummaryGrid({
    detail,
    summaryAction,
}: {
    detail: ShipmentDetail;
    summaryAction?: ReactNode;
}) {
    return (
        <div className="shipment-detail__summary card">
            <div className="card__hd shipment-detail__summary-hd">
                <span className="shipment-detail__summary-title">Resumen</span>
                {summaryAction}
            </div>
            <div className="card__bd text-sm shipment-detail__grid">
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
                    <span className="text-muted">Incidencias</span>
                    <p className="mb-0">{detail.incidentCount}</p>
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
                <div className="shipment-detail__operational">
                    <span className="text-muted">Detalles operativos</span>
                    <ShipmentOperationalDetails
                        detail={detail}
                        variant="summary"
                        className="mb-0 mt-1"
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryProse({ detail }: { detail: ShipmentDetail }) {
    return (
        <div className="card">
            <div className="card__hd">Resumen</div>
            <div className="card__bd text-sm space-y-2">
                <p>
                    <strong>Estado:</strong> {detail.status}
                </p>
                <p>
                    <strong>Producto:</strong> {detail.product}
                </p>
                <p>
                    <strong>Origen → destino:</strong> {detail.origin} → {detail.destination}
                </p>
                <ShipmentOperationalDetails detail={detail} variant="summary" />
                <p className="mono text-xs break-all">
                    <strong>Remitente:</strong> {detail.sender}
                </p>
                <p className="mono text-xs break-all">
                    <strong>Destinatario:</strong> {detail.recipient}
                </p>
            </div>
        </div>
    );
}

export function ShipmentDetailView({
    detail,
    lead,
    summaryVariant = "prose",
    showCheckpointTable = false,
    showTimeline = true,
    showMap = true,
    summaryAction,
    className,
}: ShipmentDetailViewProps) {
    const hasBody = showCheckpointTable || showTimeline || showMap;

    return (
        <div className={["shipment-detail", className].filter(Boolean).join(" ")}>
            {lead ? <div className="shipment-detail__lead">{lead}</div> : null}

            {summaryVariant === "grid" ? (
                <SummaryGrid detail={detail} summaryAction={summaryAction} />
            ) : (
                <SummaryProse detail={detail} />
            )}

            {hasBody ? (
                <div
                    className={[
                        "layout-split layout-split--2-1 shipment-detail__main mt-2",
                        showCheckpointTable ? "shipment-detail__main--with-table" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <div>
                        {showCheckpointTable ? (
                            <div className="card">
                                <div className="card__hd">Registros (tabla)</div>
                                <div className="card__bd">
                                    <CheckpointTable checkpoints={detail.checkpoints} />
                                </div>
                            </div>
                        ) : null}
                        {showTimeline ? (
                            <div className={showCheckpointTable ? "card mt-2" : "card"}>
                                <div className="card__hd">
                                    {showCheckpointTable ? "Línea de tiempo" : "Checkpoints"}
                                </div>
                                <div className="card__bd">
                                    <CheckpointTimeline checkpoints={detail.checkpoints} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {showMap ? (
                        <div>
                            <div className="card shipment-detail__map-card">
                                <div className="card__hd">
                                    {showCheckpointTable ? "Mapa de puntos" : "Mapa"}
                                </div>
                                <div className="card__bd shipment-detail__map">
                                    <MapViewLazy checkpoints={detail.checkpoints} />
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
