import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="site-footer" suppressHydrationWarning>
            <div className="shell">
                <div className="footer-grid">
                    <div>
                        <div className="footer-brand">TraceSol Logistics</div>
                        <p className="mb-0">
                            Trazabilidad con pie en el día a día y respaldo on-chain (Solana). Frontend
                            Etapa 1: registro de actor, envío y checkpoint con sincronización al
                            backend.
                        </p>
                    </div>
                    <div className="footer-col">
                        <h4>Producto</h4>
                        <ul>
                            <li>
                                <Link prefetch={false} href="/panel">
                                    Panel
                                </Link>
                            </li>
                            <li>
                                <Link prefetch={false} href="/demo">
                                    Demo flujo Etapa 1
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Infra</h4>
                        <ul>
                            <li>
                                <Link prefetch={false} href="/sistema">
                                    RPC y programa
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Legal</h4>
                        <ul>
                            <li>
                                <Link prefetch={false} href="#">
                                    Privacidad
                                </Link>
                            </li>
                            <li>
                                <Link prefetch={false} href="#">
                                    Términos
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span suppressHydrationWarning>
                        © {new Date().getFullYear()} TraceSol Logistics · TMF
                    </span>
                    <span>Maqueta de diseño · TMF-Docs/tracesol-preview</span>
                </div>
            </div>
        </footer>
    );
}
