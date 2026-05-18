"use client";

import { useCallback, useMemo, useState } from "react";

import { IncidentHubFiltersPanel } from "@/components/incidents/IncidentHubFilters";
import { IncidentHubRecentTable } from "@/components/incidents/IncidentHubRecentTable";
import { IncidentHubStats } from "@/components/incidents/IncidentHubStats";
import { postResolveIncident } from "@/lib/api/incidents";
import { useIncidentsHub } from "@/lib/api/useIncidentsHub";
import { incidentTypeLabel } from "@/lib/incidents/display";
import {
    EMPTY_INCIDENT_HUB_FILTERS,
    filterIncidentHubRecent,
    uniqueIncidentSeverities,
    uniqueIncidentSources,
    type IncidentHubFilters,
} from "@/lib/incidents/hubFilters";
import { canResolveIncident, roleDisplayName } from "@/lib/panel/capabilities";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export type IncidentHubWorkspaceProps = {
    apiBaseUrl: string;
};

export function IncidentHubWorkspace({ apiBaseUrl }: IncidentHubWorkspaceProps) {
    const { wallet, role, actorLoading } = useWalletSession();
    const { data, loading, error, reload } = useIncidentsHub(apiBaseUrl, wallet);
    const [filters, setFilters] = useState<IncidentHubFilters>(EMPTY_INCIDENT_HUB_FILTERS);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [actionBanner, setActionBanner] = useState<{
        kind: "ok" | "err";
        text: string;
    } | null>(null);

    const mayResolve = canResolveIncident(role);

    const recent = useMemo(() => data?.recent ?? [], [data]);
    const filtered = useMemo(
        () => filterIncidentHubRecent(recent, filters),
        [recent, filters],
    );
    const severityOptions = useMemo(() => uniqueIncidentSeverities(recent), [recent]);
    const sourceOptions = useMemo(() => uniqueIncidentSources(recent), [recent]);

    const handleResolve = useCallback(
        async (incidentId: string) => {
            if (!wallet || !mayResolve) {
                return;
            }
            setResolvingId(incidentId);
            setActionBanner(null);
            try {
                const res = await postResolveIncident(apiBaseUrl, incidentId, wallet);
                if (res.ok) {
                    setActionBanner({
                        kind: "ok",
                        text: `Incidencia resuelta (${incidentTypeLabel(res.data.incidentType)}).`,
                    });
                    await reload();
                } else if (res.status === 409) {
                    setActionBanner({
                        kind: "err",
                        text: "La incidencia ya estaba cerrada o no pudo resolverse.",
                    });
                    await reload();
                } else {
                    setActionBanner({
                        kind: "err",
                        text: `No se pudo resolver (HTTP ${res.status}).`,
                    });
                }
            } catch (e) {
                setActionBanner({
                    kind: "err",
                    text: e instanceof Error ? e.message : "Error de red al resolver.",
                });
            } finally {
                setResolvingId(null);
            }
        },
        [apiBaseUrl, mayResolve, reload, wallet],
    );

    return (
        <div className="admin-workspace incident-hub-workspace">
            <header className="admin-page-header">
                <div className="admin-page-header__intro">
                    <h1 className="admin-page-header__title">Centro de incidencias</h1>
                    <p className="admin-page-header__sub">
                        Inteligencia operativa: detecciones automáticas del motor de telemetría y
                        reportes críticos firmados on-chain.
                    </p>
                </div>
                <div className="admin-page-header__meta">
                    {actorLoading ? (
                        <span className="admin-page-header__meta-label">Cargando perfil…</span>
                    ) : (
                        <span className="badge badge--neutral">{roleDisplayName(role)}</span>
                    )}
                    {wallet ? (
                        <span className="admin-page-header__wallet mono" title={wallet}>
                            {wallet.slice(0, 4)}…{wallet.slice(-4)}
                        </span>
                    ) : null}
                </div>
            </header>

            {error ? (
                <p className="text-sm admin-form__err" role="alert">
                    {error}
                </p>
            ) : null}

            {actionBanner ? (
                <p
                    className={`text-sm mb-0${actionBanner.kind === "err" ? " admin-form__err" : ""}`}
                    role={actionBanner.kind === "err" ? "alert" : "status"}
                >
                    {actionBanner.text}
                </p>
            ) : null}

            {!mayResolve && role ? (
                <p className="text-sm text-muted mb-0" role="status">
                    Su rol tiene acceso de solo lectura; no puede resolver incidencias desde el panel.
                </p>
            ) : null}

            <div className="admin-workspace__stack">
                <IncidentHubStats
                    summary={data?.summary ?? null}
                    loading={loading}
                    filteredCount={filtered.length}
                    onRefresh={() => void reload()}
                />

                <IncidentHubFiltersPanel
                    filters={filters}
                    severityOptions={severityOptions}
                    sourceOptions={sourceOptions}
                    resultCount={filtered.length}
                    totalCount={recent.length}
                    onChange={setFilters}
                    onReset={() => setFilters(EMPTY_INCIDENT_HUB_FILTERS)}
                />

                <IncidentHubRecentTable
                    rows={filtered}
                    loading={loading}
                    wallet={wallet ?? ""}
                    canResolve={mayResolve}
                    resolvingId={resolvingId}
                    onResolve={(id) => void handleResolve(id)}
                />
            </div>
        </div>
    );
}
