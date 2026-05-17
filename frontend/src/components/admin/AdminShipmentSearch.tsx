"use client";

import type { ShipmentFilters } from "@/lib/admin/shipmentFilters";

export type AdminShipmentSearchProps = {
    filters: ShipmentFilters;
    statusOptions: string[];
    resultCount: number;
    totalCount: number;
    onChange: (filters: ShipmentFilters) => void;
    onReset: () => void;
};

export function AdminShipmentSearch({
    filters,
    statusOptions,
    resultCount,
    totalCount,
    onChange,
    onReset,
}: AdminShipmentSearchProps) {
    return (
        <section className="admin-section admin-search card" aria-labelledby="admin-search-title">
            <header className="card__hd admin-section__head admin-search__head">
                <div>
                    <h2 id="admin-search-title" className="admin-section__title">
                        Buscar envíos
                    </h2>
                    <p className="admin-section__desc mb-0">
                        {resultCount} resultado{resultCount === 1 ? "" : "s"} de {totalCount} en
                        total
                    </p>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
                    Limpiar filtros
                </button>
            </header>
            <div className="card__bd admin-search__fields">
                <div className="admin-search__field form-group mb-0">
                    <label htmlFor="admin-search-query">Buscar</label>
                    <input
                        id="admin-search-query"
                        type="search"
                        className="input"
                        placeholder="Producto, ID on-chain, estado…"
                        value={filters.query}
                        onChange={(e) => onChange({ ...filters, query: e.target.value })}
                    />
                </div>
                <div className="admin-search__field form-group mb-0">
                    <label htmlFor="admin-search-status">Estado</label>
                    <select
                        id="admin-search-status"
                        className="select"
                        value={filters.status}
                        onChange={(e) => onChange({ ...filters, status: e.target.value })}
                    >
                        <option value="">Todos los estados</option>
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="admin-search__field form-group mb-0">
                    <label htmlFor="admin-search-cold">Cadena de frío</label>
                    <select
                        id="admin-search-cold"
                        className="select"
                        value={filters.coldChain}
                        onChange={(e) =>
                            onChange({
                                ...filters,
                                coldChain: e.target.value as ShipmentFilters["coldChain"],
                            })
                        }
                    >
                        <option value="">Todos</option>
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                    </select>
                </div>
            </div>
        </section>
    );
}
