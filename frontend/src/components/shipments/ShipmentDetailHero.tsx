import type { ReactNode } from "react";

import { IconMapPin, IconPackage, IconThermometer } from "@/components/ui/TraceIcons";
import type { ShipmentDetail } from "@/lib/api/shipments";
import { statusBadgeClass, statusLabel } from "@/lib/shipments/display";
import { formatParticipantLine, formatParticipantSub } from "@/lib/wallet/display";

export type ShipmentDetailHeroProps = {
    detail: ShipmentDetail;
    openIncidentCount: number;
    headerActions?: ReactNode;
    backLink?: ReactNode;
};

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return iso;
    }
}

export function ShipmentDetailHero({
    detail,
    openIncidentCount,
    headerActions,
    backLink,
}: ShipmentDetailHeroProps) {
    const productTitle = detail.productLabel ?? detail.product;
    const hasAlerts = openIncidentCount > 0;

    return (
        <header className="shipment-hero">
            {backLink ? <div className="shipment-hero__nav">{backLink}</div> : null}

            <div className="shipment-hero__surface">
                <div className="shipment-hero__top">
                    <div className="shipment-hero__identity">
                        <span className="shipment-hero__glyph" aria-hidden>
                            <IconPackage />
                        </span>
                        <div className="shipment-hero__titles">
                            <p className="shipment-hero__eyebrow">Detalle de envío</p>
                            <h1 className="shipment-hero__title">{productTitle}</h1>
                            <p className="shipment-hero__code mono">
                                {detail.product}
                                <span className="shipment-hero__sep"> · </span>
                                #{detail.onChainShipmentId} on-chain
                            </p>
                        </div>
                    </div>
                    <div className="shipment-hero__status-block">
                        <span className={`shipment-hero__status ${statusBadgeClass(detail.status)}`}>
                            {statusLabel(detail.status)}
                        </span>
                        {detail.requiresColdChain ? (
                            <span className="shipment-hero__cold">
                                <IconThermometer className="trace-icon trace-icon--inline" />
                                Cadena de frío
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="shipment-hero__route" aria-label="Ruta del envío">
                    <div className="shipment-hero__route-node">
                        <span className="shipment-hero__route-label">Origen</span>
                        <span className="shipment-hero__route-value">{detail.origin}</span>
                    </div>
                    <div className="shipment-hero__route-track" aria-hidden>
                        <span className="shipment-hero__route-line" />
                        <span className="shipment-hero__route-dot" />
                    </div>
                    <div className="shipment-hero__route-node shipment-hero__route-node--end">
                        <span className="shipment-hero__route-label">Destino</span>
                        <span className="shipment-hero__route-value">{detail.destination}</span>
                    </div>
                </div>

                <dl className="shipment-hero__metrics">
                    <div className="shipment-hero__metric">
                        <dt>Eventos logísticos</dt>
                        <dd>{detail.checkpointCount}</dd>
                    </div>
                    <div
                        className={`shipment-hero__metric${hasAlerts ? " shipment-hero__metric--alert" : ""}`}
                    >
                        <dt>Incidencias</dt>
                        <dd>
                            {detail.incidentCount}
                            {hasAlerts ? (
                                <span className="shipment-hero__metric-sub">
                                    {openIncidentCount} abiertas
                                </span>
                            ) : (
                                <span className="shipment-hero__metric-sub">sin alertas</span>
                            )}
                        </dd>
                    </div>
                    <div className="shipment-hero__metric">
                        <dt>Creado</dt>
                        <dd>
                            <time dateTime={detail.createdAt}>{formatDate(detail.createdAt)}</time>
                        </dd>
                    </div>
                    <div className="shipment-hero__metric">
                        <dt>{detail.deliveredAt ? "Entregado" : "Entrega"}</dt>
                        <dd>
                            {detail.deliveredAt ? (
                                <time dateTime={detail.deliveredAt}>
                                    {formatDate(detail.deliveredAt)}
                                </time>
                            ) : (
                                <span className="shipment-hero__metric-pending">Pendiente</span>
                            )}
                        </dd>
                    </div>
                </dl>

                <div className="shipment-hero__actors">
                    <div className="shipment-hero__actor">
                        <IconMapPin className="trace-icon shipment-hero__actor-icon" />
                        <div>
                            <span className="shipment-hero__actor-role">Remitente</span>
                            <span className="shipment-hero__actor-name">
                                {formatParticipantLine(detail.senderParticipant)}
                            </span>
                            <span className="shipment-hero__actor-wallet mono">
                                {formatParticipantSub(detail.senderParticipant)}
                            </span>
                        </div>
                    </div>
                    <div className="shipment-hero__actor">
                        <IconMapPin className="trace-icon shipment-hero__actor-icon" />
                        <div>
                            <span className="shipment-hero__actor-role">Destinatario</span>
                            <span className="shipment-hero__actor-name">
                                {formatParticipantLine(detail.recipientParticipant)}
                            </span>
                            <span className="shipment-hero__actor-wallet mono">
                                {formatParticipantSub(detail.recipientParticipant)}
                            </span>
                        </div>
                    </div>
                </div>

                {headerActions ? (
                    <div className="shipment-hero__actions">{headerActions}</div>
                ) : null}
            </div>
        </header>
    );
}
