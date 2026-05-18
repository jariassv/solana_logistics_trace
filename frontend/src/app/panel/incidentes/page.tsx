"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getShipmentDetail } from "@/lib/api/shipments";
import { useShipmentsList } from "@/lib/api/useShipmentsList";
import { getPublicConfig } from "@/lib/env";
import { statusBadgeClass } from "@/lib/shipments/display";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export default function PanelIncidentesPage() {
    const { apiBaseUrl } = getPublicConfig();
    const { wallet } = useWalletSession();
    const base = apiBaseUrl.trim() !== "" ? apiBaseUrl : undefined;
    const { rows, error, loading } = useShipmentsList(base, wallet);
    const [incidentCounts, setIncidentCounts] = useState<Record<string, number>>({});
    const [countsLoading, setCountsLoading] = useState(false);

    useEffect(() => {
        if (!base || !wallet || !rows?.length) {
            return;
        }
        let cancelled = false;
        void Promise.resolve().then(() => setCountsLoading(true));
        void (async () => {
            const entries = await Promise.all(
                rows.map(async (row) => {
                    const res = await getShipmentDetail(base, row.shipmentId, wallet);
                    return [row.shipmentId, res.ok ? res.data.incidentCount : 0] as const;
                }),
            );
            if (!cancelled) {
                setIncidentCounts(Object.fromEntries(entries));
                setCountsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [base, rows, wallet]);

    const withIncidents = useMemo(
        () =>
            (rows ?? []).filter((r) => (incidentCounts[r.shipmentId] ?? 0) > 0),
        [rows, incidentCounts],
    );

    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Centro de incidencias</h1>
                <p className="page-sub">
                    Envíos con al menos una incidencia detectada o reportada. El motor inicia monitoreo al
                    crear cada envío.
                </p>

                {!apiBaseUrl?.trim() && (
                    <p className="text-muted text-sm" role="status">
                        Configure <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                    </p>
                )}
                {!wallet && (
                    <p className="text-muted text-sm" role="status">
                        Conecte la wallet para ver envíos con incidencias.
                    </p>
                )}

                {(loading || countsLoading) && (
                    <p className="text-sm text-muted">Cargando envíos e incidencias…</p>
                )}
                {error && (
                    <p className="text-sm" role="alert">
                        {error}
                    </p>
                )}

                {!loading && !countsLoading && wallet && withIncidents.length === 0 && (
                    <p className="text-sm text-muted" role="status">
                        No hay envíos con incidencias en su ámbito. Las alertas automáticas aparecen tras
                        telemetría fuera de umbral.
                    </p>
                )}

                {wallet && withIncidents.length > 0 ? (
                    <ul className="incident-hub-list">
                        {withIncidents.map((row) => (
                            <li key={row.shipmentId} className="incident-hub-list__item card">
                                <div className="card__bd">
                                    <div className="incident-hub-list__row">
                                        <div>
                                            <p className="incident-hub-list__product mb-1">
                                                {row.product}
                                            </p>
                                            <p className="text-xs text-muted mono mb-0">
                                                {row.shipmentId}
                                            </p>
                                        </div>
                                        <div className="incident-hub-list__meta">
                                            <span className={statusBadgeClass(row.status)}>
                                                {row.status}
                                            </span>
                                            <span className="badge badge--warn">
                                                {incidentCounts[row.shipmentId] ?? 0} incidencia
                                                {(incidentCounts[row.shipmentId] ?? 0) === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        prefetch={false}
                                        className="btn btn--primary btn--sm mt-3"
                                        href={`/panel/envios/${encodeURIComponent(row.shipmentId)}?wallet=${encodeURIComponent(wallet)}`}
                                    >
                                        Ver detalle
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </main>
    );
}
