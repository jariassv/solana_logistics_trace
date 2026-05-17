"use client";

import type { ShipmentDashboardStats } from "@/lib/admin/shipmentFilters";

export type AdminDashboardStatsProps = {
    stats: ShipmentDashboardStats | null;
    loading: boolean;
    filteredCount: number;
    onRefresh: () => void;
};

type StatItem = {
    id: string;
    label: string;
    hint: string;
    value: number | null;
    tone: "total" | "progress" | "delivered" | "cold";
};

function kpiValue(loading: boolean, value: number | null): string {
    if (loading) {
        return "—";
    }
    return value === null ? "0" : String(value);
}

export function AdminDashboardStats({
    stats,
    loading,
    filteredCount,
    onRefresh,
}: AdminDashboardStatsProps) {
    const items: StatItem[] = [
        {
            id: "total",
            label: "Total envíos",
            hint: "Asociados a su cartera",
            value: stats?.total ?? null,
            tone: "total",
        },
        {
            id: "progress",
            label: "En curso",
            hint: "Activos en tránsito",
            value: stats?.inProgress ?? null,
            tone: "progress",
        },
        {
            id: "delivered",
            label: "Entregados",
            hint: "Estado Delivered",
            value: stats?.delivered ?? null,
            tone: "delivered",
        },
        {
            id: "cold",
            label: "Cadena de frío",
            hint: "Temperatura controlada",
            value: stats?.coldChain ?? null,
            tone: "cold",
        },
    ];

    return (
        <section className="admin-section admin-dashboard" aria-labelledby="admin-dashboard-title">
            <header className="admin-section__head">
                <div>
                    <h2 id="admin-dashboard-title" className="admin-section__title">
                        Resumen
                    </h2>
                    <p className="admin-section__desc">
                        {loading
                            ? "Cargando métricas de sus envíos…"
                            : `Vista general · ${filteredCount} de ${stats?.total ?? 0} envíos en el listado actual`}
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    Actualizar datos
                </button>
            </header>
            <div className="admin-stat-grid" role="list">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className={`admin-stat admin-stat--${item.tone}`}
                        role="listitem"
                        aria-busy={loading}
                    >
                        <span className="admin-stat__label">{item.label}</span>
                        <span className="admin-stat__value">{kpiValue(loading, item.value)}</span>
                        <span className="admin-stat__hint">{item.hint}</span>
                    </article>
                ))}
            </div>
        </section>
    );
}
