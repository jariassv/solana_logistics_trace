import Link from "next/link";

import { ConsolaFooterLink } from "@/components/layout/ConsolaFooterLink";

export function SiteFooter() {
    return (
        <footer className="site-footer" suppressHydrationWarning>
            <div className="shell">
                <div className="footer-grid">
                    <div>
                        <div className="footer-brand">TraceSol Logistics</div>
                        <p className="mb-0">
                            Trazabilidad con pie en el día a día y respaldo on-chain (Solana): panel
                            operativo, registro de actor, envíos y checkpoints con sincronización al
                            backend.
                        </p>
                    </div>
                    <div className="footer-col">
                        <h4>Producto</h4>
                        <ul>
                            <li>
                                <Link prefetch={false} href="/envios">
                                    Consulta de envíos
                                </Link>
                            </li>
                            <li>
                                <Link prefetch={false} href="/admin">
                                    Panel Admin
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Infra</h4>
                        <ul>
                            <li>
                                <ConsolaFooterLink />
                            </li>
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
