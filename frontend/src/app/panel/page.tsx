import Link from "next/link";

/** Panel operativo de referencia (datos simulados), estilo TMF-Docs/tracesol-preview/dashboard.html */
export default function PanelPage() {
    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Dashboard operativo</h1>
                <p className="page-sub">
                    Indicadores y tablas demo — mismo lenguaje visual que la maquetación TraceSol.
                </p>

                <div className="kpi-grid">
                    <div className="kpi">
                        <div className="kpi__label">Envíos totales</div>
                        <div className="kpi__value">—</div>
                        <div className="kpi__meta">
                            MVP Etapa 1: consulta Postgres en siguiente iteración (Etapa 2)
                        </div>
                    </div>
                    <div className="kpi">
                        <div className="kpi__label">Checkpoint hoy</div>
                        <div className="kpi__value">—</div>
                        <div className="kpi__meta">
                            <span className="badge badge--neutral">on-chain ✓ sync</span>
                        </div>
                    </div>
                    <div className="kpi">
                        <div className="kpi__label">Red</div>
                        <div className="kpi__value">RPC</div>
                        <div className="kpi__meta">localnet / devnet vía .env</div>
                    </div>
                </div>

                <div className="layout-split layout-split--2-1 mt-2">
                    <div>
                        <div className="card">
                            <div className="card__hd">Actividad de registros (7 días)</div>
                            <div className="card__bd">
                                <div className="placeholder-chart">
                                    Gráfico pendiente (Recharts en etapa posterior)
                                </div>
                            </div>
                        </div>
                        <div className="card mt-2">
                            <div className="card__hd">Envíos recientes</div>
                            <div className="card__bd">
                                <div className="table-wrap">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Ruta</th>
                                                <th>Estado</th>
                                                <th>Último avance</th>
                                                <th>Tx</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan={5} className="text-muted">
                                                    Sin datos locales: use el flujo en{" "}
                                                    <Link prefetch={false} href="/demo">
                                                        Demo Etapa 1
                                                    </Link>{" "}
                                                    y el
                                                    backend sync.
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="card">
                            <div className="card__hd">Mapa rápido</div>
                            <div className="card__bd">
                                <div className="placeholder-map">Mapa (placeholder)</div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-muted mt-2 mb-0">
                    <Link
                        prefetch={false}
                        className="btn btn--secondary btn--sm mt-2"
                        href="/demo"
                    >
                        Ir al flujo técnico Etapa 1
                    </Link>
                </p>
            </div>
        </main>
    );
}
