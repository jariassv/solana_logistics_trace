import Link from "next/link";

/** Contenido de inicio inspirado en TMF-Docs/tracesol-preview/index.html */
export function LandingHome() {
    return (
        <main className="page-main">
            <div className="shell">
                <section className="hero">
                    <div>
                        <h1 className="hero__title">
                            Trazabilidad logística corporativa con evidencia verificable en cada hito
                        </h1>
                        <p className="hero__lead">
                            <strong>TraceSol Logistics</strong> unifica operación, cumplimiento y
                            auditoria en una sola plataforma. Los eventos criticos de cada envio se
                            respaldan en <strong>Solana</strong> y se sincronizan con su capa de
                            datos para reporting ejecutivo y trazabilidad end-to-end.
                        </p>
                        <div className="tag-row">
                            <span className="tag">Visibilidad multi-actor</span>
                            <span className="tag">Cumplimiento y auditoria</span>
                            <span className="tag">Integracion API-first</span>
                        </div>
                        <div className="hero__cta">
                            <Link prefetch={false} className="btn btn--primary" href="/envios">
                                Consultar envíos
                            </Link>
                            <Link prefetch={false} className="btn btn--secondary" href="/registro">
                                Registro de actor
                            </Link>
                        </div>
                    </div>
                    <div>
                        <div className="hero-visual">
                            <div
                                className="media-slot media-slot--hero"
                                role="img"
                                aria-label="Espacio reservado para imagen de la operación"
                            >
                                <span className="media-slot__label">Control Tower TraceSol</span>
                                <span className="media-slot__hint">
                                    Vista corporativa de operaciones, riesgo y cumplimiento para
                                    equipos de supply chain.
                                </span>
                            </div>
                        </div>
                        <div className="signup-card">
                            <h3>Resumen para stakeholders</h3>
                            <p className="text-sm text-muted mb-0" style={{ marginBottom: "1rem" }}>
                                Arquitectura hibrida: confiabilidad on-chain para eventos criticos y
                                consulta de alta velocidad para operacion diaria, BI y SLA.
                            </p>
                            <Link prefetch={false} className="btn btn--primary btn--block" href="/consola">
                                Estado del sistema y red
                            </Link>
                        </div>
                    </div>
                </section>

                <section id="que-ofrece" className="mt-2">
                    <div className="section-head">
                        <h2>Capacidades clave para operaciones corporativas</h2>
                        <p>
                            Diseñado para lideres de operaciones, calidad y compliance que necesitan
                            decisiones con evidencia.
                        </p>
                    </div>
                    <div className="feature-grid">
                        <article className="feature">
                            <div className="feature__icon">◎</div>
                            <h3>Cadena de custodia verificable</h3>
                            <p>
                                Registre responsables, traspasos y checkpoints con sello temporal para
                                reducir disputas entre remitente, operador y receptor.
                            </p>
                            <small>Trazabilidad consistente para auditorias internas y externas.</small>
                        </article>
                        <article className="feature">
                            <div className="feature__icon">◎</div>
                            <h3>Panel operativo y ejecutivo</h3>
                            <p>
                                Centralice estado de envios, excepciones y actividad reciente en una
                                vista accionable para equipos de operaciones y management.
                            </p>
                            <small>Preparado para KPIs de SLA, OTIF y nivel de servicio.</small>
                        </article>
                        <article className="feature">
                            <div className="feature__icon">◎</div>
                            <h3>Integracion API y escalabilidad</h3>
                            <p>
                                Enfoque API-first para integrarse con ERPs, WMS y herramientas de
                                analitica sin romper procesos existentes.
                            </p>
                            <small>Arquitectura modular para crecer por etapas de producto.</small>
                        </article>
                    </div>
                </section>

                <section className="mt-2">
                    <div className="section-head">
                        <h2>Gobernanza y confianza operacional</h2>
                        <p>
                            Una base comun para operaciones, clientes y socios estrategicos.
                        </p>
                    </div>
                    <div className="tri-grid">
                        <article className="tri-card">
                            <div className="tri-card__icon">①</div>
                            <h3>Transparencia multi-organizacion</h3>
                            <p>
                                Acceso consistente a eventos y estados para todas las partes
                                autorizadas de la cadena.
                            </p>
                        </article>
                        <article className="tri-card">
                            <div className="tri-card__icon">②</div>
                            <h3>Menor riesgo operativo</h3>
                            <p>
                                Evidencia compartida para disminuir friccion en incidencias y acelerar
                                resolucion de reclamaciones.
                            </p>
                        </article>
                        <article className="tri-card">
                            <div className="tri-card__icon">③</div>
                            <h3>Base para compliance continuo</h3>
                            <p>
                                Historial auditable para controles internos, calidad y reporting
                                regulatorio.
                            </p>
                        </article>
                    </div>
                </section>

                <section className="mt-2">
                    <div className="section-head">
                        <h2>Sectores con mayor impacto</h2>
                        <p>
                            Implementacion orientada a industrias con exigencia de trazabilidad y
                            calidad.
                        </p>
                    </div>
                    <div className="audience-grid">
                        <article className="audience-card">
                            <h3>Farmaceutica y salud</h3>
                            <p>
                                Custodia, cumplimiento y control de eventos en cadenas con altos
                                requisitos regulatorios.
                            </p>
                        </article>
                        <article className="audience-card">
                            <h3>Alimentos y cadena de frio</h3>
                            <p>
                                Monitoreo de hitos y condiciones para proteger calidad, inocuidad y
                                experiencia del cliente final.
                            </p>
                        </article>
                        <article className="audience-card">
                            <h3>Manufactura y distribucion</h3>
                            <p>
                                Visibilidad entre plantas, hubs y ultima milla con datos confiables
                                para planificacion y mejora continua.
                            </p>
                        </article>
                    </div>
                </section>

                <section className="card mt-2">
                    <div className="card__bd">
                        <div className="flex-between">
                            <div>
                                <h2 className="page-title mb-0">
                                    Comience con una evaluacion ejecutiva
                                </h2>
                                <p className="text-muted text-sm mt-1">
                                    Consulta pública, registro de actor, panel admin por rol y consola
                                    del sistema.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <Link prefetch={false} className="btn btn--primary" href="/envios">
                                    Consultar envíos
                                </Link>
                                <Link prefetch={false} className="btn btn--secondary" href="/admin">
                                    Panel Admin
                                </Link>
                                <Link prefetch={false} className="btn btn--ghost" href="/consola">
                                    Consola
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
