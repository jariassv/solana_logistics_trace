import Image from "next/image";
import Link from "next/link";

import {
    IconAlert,
    IconCheckCircle,
    IconHub,
    IconLink,
    IconPackage,
    IconRadio,
    IconThermometer,
    IconTruck,
    IconUser,
} from "@/components/ui/TraceIcons";

const LANDING_IMAGE = "/imagenes/landing-home.png";

const CAPABILITIES = [
    {
        icon: IconPackage,
        title: "Registro y ciclo de vida del envío",
        description:
            "Alta de envíos con origen, destino, producto y detalles operativos. Seguimiento del estado logístico de punta a punta.",
    },
    {
        icon: IconTruck,
        title: "Eventos logísticos on-chain",
        description:
            "Checkpoints de recogida, tránsito, hub y entrega con actor responsable, ubicación y sello temporal verificable.",
    },
    {
        icon: IconThermometer,
        title: "Cadena de frío y telemetría",
        description:
            "Monitoreo de temperatura y humedad con umbrales configurables e incidencias automáticas ante desviaciones.",
    },
    {
        icon: IconAlert,
        title: "Gestión de incidencias",
        description:
            "Alertas críticas, resolución por rol y trazabilidad de cada reporte vinculado al envío y a la red.",
    },
    {
        icon: IconUser,
        title: "Panel multi-rol",
        description:
            "Vistas para remitente, transportista, destinatario y administración con permisos alineados a la operación.",
    },
    {
        icon: IconHub,
        title: "Consulta pública y API",
        description:
            "Consulta de envíos por UUID, mapa de recorrido y capa REST para integrar ERP, WMS y BI corporativo.",
    },
] as const;

const BLOCKCHAIN_BENEFITS = [
    {
        icon: IconLink,
        title: "Evidencia inmutable",
        description:
            "Cada creación de envío, checkpoint e incidencia crítica deja una firma de transacción consultable en Solana.",
    },
    {
        icon: IconCheckCircle,
        title: "Confianza entre actores",
        description:
            "Remitente, operador y receptor comparten la misma fuente de verdad sin depender de registros aislados.",
    },
    {
        icon: IconRadio,
        title: "Auditoría y cumplimiento",
        description:
            "Historial apto para controles de calidad, disputas comerciales y revisiones regulatorias.",
    },
    {
        icon: IconPackage,
        title: "Arquitectura híbrida",
        description:
            "Eventos críticos on-chain y capa operativa de alta velocidad para consultas, mapas y reporting diario.",
    },
] as const;

const SECTORS = [
    {
        title: "Farmacéutica y salud",
        text: "Custodia documentada y trazabilidad para cadenas con requisitos GxP y cadena de suministro regulada.",
    },
    {
        title: "Alimentos y cadena de frío",
        text: "Control de hitos y condiciones para proteger inocuidad, calidad y experiencia del cliente final.",
    },
    {
        title: "Manufactura y distribución",
        text: "Visibilidad entre planta, hubs y última milla con datos confiables para SLA y mejora continua.",
    },
] as const;

/** Landing corporativa: plataforma, beneficios blockchain y CTAs principales. */
export function LandingHome() {
    return (
        <main className="page-main landing">
            <div className="shell">
                <section className="landing-hero" aria-labelledby="landing-hero-title">
                    <div className="landing-hero__copy">
                        <p className="landing-hero__eyebrow">TraceSol Logistics · Enterprise</p>
                        <h1 id="landing-hero-title" className="landing-hero__title">
                            Trazabilidad logística con respaldo blockchain para operaciones
                            corporativas
                        </h1>
                        <p className="landing-hero__lead">
                            Unifique operación, cumplimiento y auditoría en una plataforma diseñada
                            para equipos de supply chain. Los hitos críticos se registran en{" "}
                            <strong>Solana</strong> y se consultan en tiempo real para decisiones
                            con evidencia verificable.
                        </p>
                        <div className="tag-row landing-hero__tags">
                            <span className="tag">Multi-actor</span>
                            <span className="tag">Cadena de frío</span>
                            <span className="tag">API-first</span>
                            <span className="tag">Solana</span>
                        </div>
                        <div className="hero__cta landing-hero__cta">
                            <Link prefetch={false} className="btn btn--primary" href="/envios">
                                Consultar envíos
                            </Link>
                            <Link prefetch={false} className="btn btn--secondary" href="/registro">
                                Registro de actor
                            </Link>
                            <Link prefetch={false} className="btn btn--ghost" href="/panel">
                                Panel operativo
                            </Link>
                        </div>
                    </div>
                    <figure className="landing-hero__visual">
                        <Image
                            src={LANDING_IMAGE}
                            alt="Panel de control TraceSol: trazabilidad de envíos, mapa de recorrido y línea de tiempo logística"
                            width={720}
                            height={480}
                            priority
                            className="landing-hero__image"
                            sizes="(min-width: 900px) 50vw, 100vw"
                        />
                    </figure>
                </section>

                <section className="landing-strip" aria-label="Pilares de la plataforma">
                    <div className="landing-strip__item">
                        <span className="landing-strip__value">On-chain</span>
                        <span className="landing-strip__label">Eventos críticos en Solana</span>
                    </div>
                    <div className="landing-strip__item">
                        <span className="landing-strip__value">E2E</span>
                        <span className="landing-strip__label">Trazabilidad punta a punta</span>
                    </div>
                    <div className="landing-strip__item">
                        <span className="landing-strip__value">24/7</span>
                        <span className="landing-strip__label">Consulta y monitoreo</span>
                    </div>
                    <div className="landing-strip__item">
                        <span className="landing-strip__value">API</span>
                        <span className="landing-strip__label">Integración corporativa</span>
                    </div>
                </section>

                <section id="plataforma" className="landing-section">
                    <div className="section-head landing-section__head">
                        <p className="landing-section__eyebrow">Plataforma</p>
                        <h2>Funcionalidades del sistema</h2>
                        <p>
                            Herramientas para operación diaria, control de riesgo y visibilidad
                            ejecutiva en un solo entorno.
                        </p>
                    </div>
                    <div className="landing-capabilities">
                        {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                            <article key={title} className="landing-capability">
                                <span className="landing-capability__icon" aria-hidden>
                                    <Icon className="trace-icon" />
                                </span>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="blockchain" className="landing-section landing-section--accent">
                    <div className="landing-blockchain">
                        <div className="landing-blockchain__intro">
                            <p className="landing-section__eyebrow">Blockchain</p>
                            <h2>Beneficios de registrar en Solana</h2>
                            <p>
                                La blockchain aporta una capa de confianza compartida: no sustituye
                                su ERP ni su WMS, pero ancla los eventos que no pueden disputarse
                                después del hecho.
                            </p>
                            <ul className="landing-blockchain__list text-sm">
                                <li>Firma de transacción por creación de envío y checkpoints.</li>
                                <li>Sincronización automática entre red y base operativa.</li>
                                <li>Explorador público para auditorías externas (devnet/mainnet).</li>
                            </ul>
                            <Link prefetch={false} className="btn btn--secondary btn--sm" href="/consola">
                                Estado de red y programa
                            </Link>
                        </div>
                        <div className="landing-benefits">
                            {BLOCKCHAIN_BENEFITS.map(({ icon: Icon, title, description }) => (
                                <article key={title} className="landing-benefit">
                                    <span className="landing-benefit__icon" aria-hidden>
                                        <Icon className="trace-icon" />
                                    </span>
                                    <div>
                                        <h3>{title}</h3>
                                        <p>{description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="landing-section">
                    <div className="section-head landing-section__head">
                        <p className="landing-section__eyebrow">Flujo</p>
                        <h2>Cómo opera TraceSol</h2>
                        <p>De la wallet del actor al detalle consultable por clientes y auditores.</p>
                    </div>
                    <ol className="landing-flow">
                        <li className="landing-flow__step">
                            <span className="landing-flow__num">1</span>
                            <h3>Registro de actores</h3>
                            <p>
                                Cada participante se registra on-chain con rol y queda habilitado
                                para operar según permisos.
                            </p>
                        </li>
                        <li className="landing-flow__step">
                            <span className="landing-flow__num">2</span>
                            <h3>Envío y eventos</h3>
                            <p>
                                Creación del envío y checkpoints con geolocalización, sensores e
                                incidencias sincronizados.
                            </p>
                        </li>
                        <li className="landing-flow__step">
                            <span className="landing-flow__num">3</span>
                            <h3>Consulta y evidencia</h3>
                            <p>
                                Panel, consulta pública y tx hash para verificar cada hito ante
                                socios o compliance.
                            </p>
                        </li>
                    </ol>
                </section>

                <section className="landing-section">
                    <div className="section-head landing-section__head">
                        <p className="landing-section__eyebrow">Industrias</p>
                        <h2>Sectores con mayor impacto</h2>
                        <p>
                            Implementación orientada a cadenas con exigencia de trazabilidad,
                            calidad y cumplimiento.
                        </p>
                    </div>
                    <div className="audience-grid">
                        {SECTORS.map(({ title, text }) => (
                            <article key={title} className="audience-card">
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-cta card">
                    <div className="card__bd landing-cta__inner">
                        <div>
                            <h2 className="landing-cta__title">
                                Evalúe TraceSol en su operación logística
                            </h2>
                            <p className="text-muted text-sm mb-0">
                                Consulta pública, registro de actores, panel por rol y consola del
                                sistema — listo para demostración y piloto corporativo.
                            </p>
                        </div>
                        <div className="btn-row landing-cta__actions">
                            <Link prefetch={false} className="btn btn--primary" href="/envios">
                                Consultar envíos
                            </Link>
                            <Link prefetch={false} className="btn btn--secondary" href="/admin">
                                Panel Admin
                            </Link>
                            <Link prefetch={false} className="btn btn--ghost" href="/sistema">
                                Documentación
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
