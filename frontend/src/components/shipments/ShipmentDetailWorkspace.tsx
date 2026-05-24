"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { IncidentHubNavLink } from "@/components/incidents/IncidentHubNavLink";
import { CheckpointTable } from "@/components/shipments/CheckpointTable";
import { ShipmentDetailHero } from "@/components/shipments/ShipmentDetailHero";
import { ShipmentIncidentCard } from "@/components/shipments/ShipmentIncidentCard";
import { ShipmentMonitoringGlance } from "@/components/shipments/ShipmentMonitoringGlance";
import { ShipmentRecorridoAside } from "@/components/shipments/ShipmentRecorridoAside";
import { ShipmentTimelineTrack } from "@/components/shipments/ShipmentTimelineTrack";
import { useShipmentIncidents } from "@/lib/api/useShipmentIncidents";
import { useShipmentTelemetry } from "@/lib/api/useShipmentTelemetry";
import type { IncidentItem } from "@/lib/api/incidents";
import type { ShipmentDetail } from "@/lib/api/shipments";
import { canResolveIncident } from "@/lib/panel/capabilities";
import { buildMonitoringGlance } from "@/lib/telemetry/monitoringGlance";

type DetailTab = "timeline" | "incidents";

export type ShipmentDetailWorkspaceProps = {
    detail: ShipmentDetail;
    apiBaseUrl: string;
    wallet: string | null;
    role: string | null;
    onDetailReload?: () => void;
    headerActions?: ReactNode;
    showCheckpointTable?: boolean;
    backLink?: ReactNode;
    canAnchorIncidentOnChain?: boolean;
    onAnchorIncidentOnChain?: (incident: IncidentItem) => void;
};

export function ShipmentDetailWorkspace({
    detail,
    apiBaseUrl,
    wallet,
    role,
    onDetailReload,
    headerActions,
    showCheckpointTable = false,
    backLink,
    canAnchorIncidentOnChain = false,
    onAnchorIncidentOnChain,
}: ShipmentDetailWorkspaceProps) {
    const [tab, setTab] = useState<DetailTab>("timeline");
    const [showTable, setShowTable] = useState(false);

    const { items, loading, error, reload } = useShipmentIncidents(
        apiBaseUrl,
        detail.shipmentId,
        wallet,
    );
    const telemetry = useShipmentTelemetry(apiBaseUrl, detail.shipmentId, wallet);
    const mayResolve = canResolveIncident(role);
    const openCount = detail.openIncidentCount ?? items.filter((i) => i.status === "Open").length;

    const monitoringGlance = useMemo(
        () => buildMonitoringGlance(telemetry.items),
        [telemetry.items],
    );
    const showMonitoring =
        detail.requiresColdChain ||
        monitoringGlance.length > 0 ||
        telemetry.loading;

    const onIncidentResolved = () => {
        void reload();
        onDetailReload?.();
    };

    const openIncidents = items.filter((i) => i.status === "Open");

    return (
        <div className="shipment-detail-pro">
            <ShipmentDetailHero
                detail={detail}
                openIncidentCount={openCount}
                apiBaseUrl={apiBaseUrl}
                headerActions={headerActions}
                backLink={backLink}
            />

            <div className="shipment-detail-pro__body">
                <section className="shipment-detail-pro__main">
                    <nav className="shipment-detail-pro__tabs" aria-label="Secciones del detalle">
                        <button
                            type="button"
                            className={`shipment-detail-pro__tab${tab === "timeline" ? " is-active" : ""}`}
                            onClick={() => setTab("timeline")}
                        >
                            Trazabilidad
                            <span className="shipment-detail-pro__tab-count">
                                {detail.checkpoints.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`shipment-detail-pro__tab${tab === "incidents" ? " is-active" : ""}`}
                            onClick={() => setTab("incidents")}
                        >
                            Incidencias
                            {openCount > 0 ? (
                                <span className="shipment-detail-pro__tab-badge">{openCount}</span>
                            ) : (
                                <span className="shipment-detail-pro__tab-count">{items.length}</span>
                            )}
                        </button>
                        <div className="shipment-detail-pro__tabs-spacer" />
                        <IncidentHubNavLink className="btn btn--ghost btn--sm" />
                    </nav>

                    <div className="shipment-detail-pro__panel">
                        {tab === "timeline" ? (
                            <>
                                <ShipmentTimelineTrack checkpoints={detail.checkpoints} />
                                {showCheckpointTable ? (
                                    <div className="shipment-detail-pro__table-toggle">
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm"
                                            onClick={() => setShowTable((v) => !v)}
                                        >
                                            {showTable
                                                ? "Ocultar registro tabular"
                                                : "Ver registro tabular"}
                                        </button>
                                        {showTable ? (
                                            <div className="mt-2">
                                                <CheckpointTable checkpoints={detail.checkpoints} />
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <>
                                {loading ? (
                                    <p className="text-sm text-muted mb-0">Cargando incidencias…</p>
                                ) : error ? (
                                    <p className="text-sm admin-form__err mb-0" role="alert">
                                        {error}
                                    </p>
                                ) : items.length === 0 ? (
                                    <div className="shipment-detail-pro__empty" role="status">
                                        <p className="mb-0">Sin incidencias en este envío.</p>
                                        <p className="text-xs text-muted mb-0 mt-1">
                                            Las alertas automáticas aparecen tras el pickup cuando la
                                            telemetría supera los umbrales del producto.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {openIncidents.length > 0 ? (
                                            <p className="shipment-detail-pro__incidents-lead">
                                                {openIncidents.length} incidencia
                                                {openIncidents.length === 1 ? "" : "s"} requiere
                                                {openIncidents.length === 1 ? "" : "n"} atención.
                                            </p>
                                        ) : null}
                                        <ul className="shipment-incident-stack">
                                            {items.map((inc) => (
                                                <li key={inc.id}>
                                                    <ShipmentIncidentCard
                                                        incident={inc}
                                                        apiBaseUrl={apiBaseUrl}
                                                        wallet={wallet ?? ""}
                                                        canResolve={Boolean(wallet) && mayResolve}
                                                        canAnchorOnChain={canAnchorIncidentOnChain}
                                                        onAnchorOnChain={onAnchorIncidentOnChain}
                                                        onResolved={onIncidentResolved}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <aside className="shipment-detail-pro__aside">
                    <div className="shipment-detail-pro__aside-card shipment-detail-pro__aside-card--map">
                        <h2 className="shipment-detail-pro__aside-title">Recorrido</h2>
                        <ShipmentRecorridoAside
                            origin={detail.origin}
                            destination={detail.destination}
                            apiBaseUrl={apiBaseUrl}
                        />
                    </div>

                    {showMonitoring ? (
                        <div className="shipment-detail-pro__aside-card">
                            <h2 className="shipment-detail-pro__aside-title">Monitoreo</h2>
                            <p className="shipment-detail-pro__aside-desc">
                                Última lectura por sensor — no es un histórico completo.
                            </p>
                            <ShipmentMonitoringGlance
                                items={telemetry.items}
                                loading={telemetry.loading}
                                requiresColdChain={detail.requiresColdChain}
                            />
                        </div>
                    ) : null}
                </aside>
            </div>
        </div>
    );
}
