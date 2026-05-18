"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isKnownActorRole } from "@/lib/panel/capabilities";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function linkClass(active: boolean): string {
    return `panel-etapa2-rail__link${active ? " is-active" : ""}`;
}

export function PanelEtapa2Rail() {
    const pathname = usePathname();
    const { wallet, role, actorLoading } = useWalletSession();

    const resumenActive = pathname === "/panel" || pathname === "/panel/";
    const enviosActive = pathname.startsWith("/panel/envios");
    const adminActive = pathname.startsWith("/admin");
    return (
        <aside className="panel-etapa2-rail" aria-label="Navegación del panel">
            <div className="panel-etapa2-rail__brand">Panel operativo</div>
            {!actorLoading && role && isKnownActorRole(role) && (
                <p
                    className="panel-etapa2-rail__role text-xs text-muted mb-2 mt-0"
                    data-testid="panel-role-badge"
                >
                    Rol: <strong>{role}</strong>
                </p>
            )}
            <nav className="panel-etapa2-rail__nav">
                <Link prefetch={false} className={linkClass(resumenActive)} href="/panel">
                    Resumen
                </Link>
                <Link prefetch={false} className={linkClass(enviosActive)} href="/panel/envios">
                    Envíos
                </Link>
                {wallet ? (
                    <Link prefetch={false} className={linkClass(adminActive)} href="/admin">
                        Admin
                    </Link>
                ) : null}
                <Link prefetch={false} className={linkClass(pathname.startsWith("/consola"))} href="/consola">
                    Consola
                </Link>
                <Link prefetch={false} className={linkClass(pathname.startsWith("/sistema"))} href="/sistema">
                    Red (.env)
                </Link>
            </nav>
        </aside>
    );
}
