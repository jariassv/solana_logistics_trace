"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ShipmentTracker } from "@/components/panel/ShipmentTracker";
import { useShipmentsList } from "@/lib/api/useShipmentsList";
import {
    canRecordCheckpoint,
    canSenderRegisterShipments,
    seesOperationalShipmentInventory,
} from "@/lib/panel/capabilities";
import { getPublicConfig } from "@/lib/env";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function roleHeadline(
    role: string | null,
    actorLoading: boolean,
    wallet: string | null,
): { title: string; sub: string } {
    if (wallet && !actorLoading && role === null) {
        return {
            title: "Espacio de trabajo",
            sub: "Su cartera no tiene actor en el backend. Regístrese para ver el panel por rol.",
        };
    }
    if (!wallet && !actorLoading) {
        return {
            title: "Espacio de trabajo",
            sub: "Conecte la wallet y regístrese como actor para ver un resumen acorde a su rol.",
        };
    }
    switch (role) {
        case "Sender":
            return {
                title: "Dashboard — Remitente",
                sub: "Envíos asociados a su cartera, creación de nuevos envíos y seguimiento operativo.",
            };
        case "Carrier":
            return {
                title: "Dashboard — Transporte",
                sub: "Inventario operativo de envíos y registro de checkpoints desde el centro de administración.",
            };
        case "Hub":
            return {
                title: "Dashboard — Hub",
                sub: "Inventario operativo de envíos y eventos logísticos en su nodo.",
            };
        case "Recipient":
            return {
                title: "Dashboard — Destinatario",
                sub: "Seguimiento de envíos dirigidos a su cartera.",
            };
        case "Inspector":
            return {
                title: "Dashboard — Inspección",
                sub: "Vista de auditoría (solo lectura) sobre el inventario operativo de envíos.",
            };
        default:
            return {
                title: "Dashboard operativo",
                sub: "Resumen según el rol devuelto por el backend para su wallet.",
            };
    }
}

function panelDetailHref(shipmentId: string, walletAddr: string): string {
    return `/panel/envios/${encodeURIComponent(shipmentId)}?wallet=${encodeURIComponent(walletAddr)}`;
}

export function PanelRoleDashboard() {
    const cfg = useMemo(() => getPublicConfig(), []);
    const apiBase = cfg.apiBaseUrl.trim() !== "" ? cfg.apiBaseUrl : undefined;
    const { wallet, role, actorLoading } = useWalletSession();
    const { rows, error, loading, reload } = useShipmentsList(apiBase, wallet);

    const { title, sub } = roleHeadline(role, actorLoading, wallet);
    const showSenderCta = canSenderRegisterShipments(role);
    const showRecordCta = canRecordCheckpoint(role);
    const operationalInventory = seesOperationalShipmentInventory(role);

    const total = rows?.length ?? null;
    const delivered = rows?.filter((r) => r.status === "Delivered").length ?? null;
    const inProgress =
        rows?.filter((r) => r.status !== "Delivered" && r.status !== "Cancelled").length ?? null;

    const kpiTotal = loading ? "…" : total === null ? "—" : String(total);
    const kpiActive = loading ? "…" : inProgress === null ? "—" : String(inProgress);
    const kpiDone = loading ? "…" : delivered === null ? "—" : String(delivered);

    return (
        <>
            <h1 className="page-title">{title}</h1>
            <p className="page-sub">{sub}</p>

            {!cfg.apiBaseUrl?.trim() && (
                <p className="text-muted text-sm mt-2" role="status">
                    Defina <code className="mono">NEXT_PUBLIC_API_BASE_URL</code> (p. ej.{" "}
                    <span className="mono">http://127.0.0.1:8000/api/v1</span>) para cargar envíos y
                    rol.
                </p>
            )}

            {!wallet && cfg.apiBaseUrl?.trim() && (
                <p className="text-muted text-sm mt-2" role="status">
                    Use el botón de wallet en el encabezado para cargar su rol y envíos.
                </p>
            )}

            {wallet && cfg.apiBaseUrl?.trim() && actorLoading && (
                <p className="text-muted text-sm mt-2">Cargando perfil…</p>
            )}

            {wallet && cfg.apiBaseUrl?.trim() && !actorLoading && role === null && (
                <p className="text-sm mt-2" role="status">
                    No hay actor registrado para esta wallet en el backend.{" "}
                    <Link prefetch={false} href="/registro" className="btn btn--secondary btn--sm">
                        Registrarse como actor
                    </Link>
                </p>
            )}

            <div className="kpi-grid mt-2">
                <div className="kpi">
                    <div className="kpi__label">Envíos visibles</div>
                    <div className="kpi__value">{kpiTotal}</div>
                    <div className="kpi__meta">
                        {operationalInventory
                            ? "Inventario operativo (API)"
                            : "Listado filtrado por su cartera (API)"}
                    </div>
                </div>
                <div className="kpi">
                    <div className="kpi__label">En curso</div>
                    <div className="kpi__value">{kpiActive}</div>
                    <div className="kpi__meta">Distintos de entregado o cancelado</div>
                </div>
                <div className="kpi">
                    <div className="kpi__label">Entregados</div>
                    <div className="kpi__value">{kpiDone}</div>
                    <div className="kpi__meta">Estado Delivered</div>
                </div>
            </div>

            {showSenderCta && wallet && cfg.apiBaseUrl?.trim() && !actorLoading && (
                <p className="mt-2 mb-0">
                    <Link prefetch={false} className="btn btn--primary btn--sm" href="/admin">
                        Nuevo envío
                    </Link>
                    <span className="text-sm text-muted ms-2">
                        Creación y firma en cadena; sincronización al backend.
                    </span>
                </p>
            )}

            {showRecordCta && wallet && cfg.apiBaseUrl?.trim() && !actorLoading && (
                <p className="mt-2 mb-0">
                    <Link prefetch={false} className="btn btn--primary btn--sm" href="/admin">
                        Registrar eventos
                    </Link>
                    <span className="text-sm text-muted ms-2">
                        Centro de administración: listado, detalle y checkpoints on-chain.
                    </span>
                </p>
            )}

            {wallet && cfg.apiBaseUrl?.trim() && (
                <div className="mt-2">
                    <ShipmentTracker
                        apiBaseUrl={cfg.apiBaseUrl}
                        wallet={wallet}
                        detailHref={panelDetailHref}
                        title={operationalInventory ? "Inventario de envíos" : "Mis envíos"}
                        controlled={{ rows, loading, error, onReload: reload }}
                        headerActions={
                            <Link prefetch={false} className="btn btn--ghost btn--sm" href="/panel/envios">
                                Vista completa
                            </Link>
                        }
                    />
                </div>
            )}

            <div className="layout-split layout-split--2-1 mt-2">
                <div className="card">
                    <div className="card__hd">Actividad (referencia)</div>
                    <div className="card__bd">
                        <div className="placeholder-chart text-sm text-muted mb-0">
                            Gráficos analíticos opcionales en una iteración posterior.
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card__hd">Mapa rápido</div>
                    <div className="card__bd">
                        <div className="placeholder-map text-sm text-muted mb-0">
                            Abra un envío para ver mapa y línea de tiempo detallada.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
