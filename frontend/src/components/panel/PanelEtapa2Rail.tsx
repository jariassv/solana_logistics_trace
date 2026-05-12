"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    canAccessOnChainOperationsPanel,
    canOpenShipmentTracker,
    isKnownActorRole,
} from "@/lib/panel/capabilities";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function linkClass(active: boolean): string {
    return `panel-etapa2-rail__link${active ? " is-active" : ""}`;
}

export function PanelEtapa2Rail() {
    const pathname = usePathname();
    const { wallet, role, actorLoading } = useWalletSession();

    const enviosActive = pathname.startsWith("/panel/envios");
    const panelRootActive = pathname === "/panel";
    const showOps = canAccessOnChainOperationsPanel(role);
    const enviosEnabled = canOpenShipmentTracker(Boolean(wallet));

    return (
        <aside className="panel-etapa2-rail" aria-label="Navegación del panel">
            <div className="panel-etapa2-rail__brand">Panel operativo</div>
            {!actorLoading && role && isKnownActorRole(role) && (
                <p className="panel-etapa2-rail__role text-xs text-muted mb-2 mt-0" data-testid="panel-role-badge">
                    Rol: <strong>{role}</strong>
                </p>
            )}
            <nav className="panel-etapa2-rail__nav">
                <Link prefetch={false} className={linkClass(panelRootActive)} href="/panel">
                    Resumen
                </Link>
                <Link
                    prefetch={false}
                    className={`${linkClass(enviosActive)}${!enviosEnabled ? " panel-etapa2-rail__link--muted" : ""}`}
                    href="/panel/envios"
                    title={!enviosEnabled ? "Conecta la wallet en el encabezado" : undefined}
                >
                    Envíos
                </Link>
                {showOps && (
                    <Link prefetch={false} className={linkClass(pathname.startsWith("/demo"))} href="/demo">
                        Operaciones on-chain
                    </Link>
                )}
                <Link prefetch={false} className={linkClass(pathname.startsWith("/sistema"))} href="/sistema">
                    Sistema
                </Link>
            </nav>
        </aside>
    );
}
