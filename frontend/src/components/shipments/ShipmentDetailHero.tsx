import type { ReactNode } from "react";

import { ShipmentJourneyTimeline } from "@/components/shipments/ShipmentJourneyTimeline";
import { IconPackage, IconThermometer } from "@/components/ui/TraceIcons";
import type { ShipmentDetail } from "@/lib/api/shipments";
import {
    formatQuantityLine,
    formatWeightKg,
    priorityLabel,
} from "@/lib/shipment/shipmentDetailsForm";
import { statusBadgeClass, statusLabel } from "@/lib/shipments/display";
import { formatParticipantLine, formatParticipantSub } from "@/lib/wallet/display";

export type ShipmentDetailHeroProps = {
    detail: ShipmentDetail;
    openIncidentCount: number;
    apiBaseUrl?: string;
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

function formatDateOnly(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
        return iso;
    }
}

export function ShipmentDetailHero({
    detail,
    openIncidentCount,
    apiBaseUrl,
    headerActions,
    backLink,
}: ShipmentDetailHeroProps) {
    const productTitle = detail.productLabel ?? detail.product;
    const hasAlerts = openIncidentCount > 0;
    const hasOperationalDetails =
        detail.weightKg != null ||
        detail.quantity != null ||
        detail.estimatedDeliveryAt != null ||
        detail.referenceCode != null ||
        detail.notes != null ||
        detail.priority !== "normal";

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
                            <p className="shipment-hero__product mono">{detail.product}</p>
                            <p className="shipment-hero__uuid">
                                <span className="shipment-hero__uuid-label">ID envío</span>
                                <span className="shipment-hero__uuid-value mono" title={detail.shipmentId}>
                                    {detail.shipmentId}
                                </span>
                            </p>
                            <p className="shipment-hero__onchain mono">
                                On-chain #{detail.onChainShipmentId}
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

                <ShipmentJourneyTimeline
                    origin={detail.origin}
                    destination={detail.destination}
                    status={detail.status}
                    checkpoints={detail.checkpoints}
                    createdAt={detail.createdAt}
                    apiBaseUrl={apiBaseUrl}
                />

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
                            ) : detail.estimatedDeliveryAt ? (
                                <time dateTime={detail.estimatedDeliveryAt}>
                                    Est. {formatDateOnly(detail.estimatedDeliveryAt)}
                                </time>
                            ) : (
                                <span className="shipment-hero__metric-pending">Pendiente</span>
                            )}
                        </dd>
                    </div>
                    {detail.weightKg != null ? (
                        <div className="shipment-hero__metric">
                            <dt>Peso</dt>
                            <dd>{formatWeightKg(detail.weightKg)}</dd>
                        </div>
                    ) : null}
                    {detail.quantity != null ? (
                        <div className="shipment-hero__metric">
                            <dt>Cantidad</dt>
                            <dd>{formatQuantityLine(detail.quantity, detail.quantityUnit)}</dd>
                        </div>
                    ) : null}
                    {detail.priority !== "normal" ? (
                        <div className="shipment-hero__metric">
                            <dt>Prioridad</dt>
                            <dd>{priorityLabel(detail.priority)}</dd>
                        </div>
                    ) : null}
                    {detail.referenceCode ? (
                        <div className="shipment-hero__metric">
                            <dt>Referencia</dt>
                            <dd className="mono">{detail.referenceCode}</dd>
                        </div>
                    ) : null}
                </dl>

                {hasOperationalDetails && detail.notes ? (
                    <p className="shipment-hero__notes text-sm text-muted mb-0">
                        <strong>Notas:</strong> {detail.notes}
                    </p>
                ) : null}

                <div className="shipment-hero__actors">
                    <div className="shipment-hero__actor">
                        <span className="shipment-hero__actor-role">Remitente</span>
                        <span className="shipment-hero__actor-name">
                            {formatParticipantLine(detail.senderParticipant)}
                        </span>
                        <span className="shipment-hero__actor-wallet mono">
                            {formatParticipantSub(detail.senderParticipant)}
                        </span>
                    </div>
                    <div className="shipment-hero__actor">
                        <span className="shipment-hero__actor-role">Destinatario</span>
                        <span className="shipment-hero__actor-name">
                            {formatParticipantLine(detail.recipientParticipant)}
                        </span>
                        <span className="shipment-hero__actor-wallet mono">
                            {formatParticipantSub(detail.recipientParticipant)}
                        </span>
                    </div>
                </div>

                {headerActions ? (
                    <div className="shipment-hero__actions">{headerActions}</div>
                ) : null}
            </div>
        </header>
    );
}
