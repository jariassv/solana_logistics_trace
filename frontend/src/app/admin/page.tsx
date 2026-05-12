"use client";

import Link from "next/link";

import { canUseOperationsDemoNav } from "@/lib/panel/capabilities";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function roleCards(role: string | null): { title: string; body: string; href?: string; label?: string }[] {
    switch (role) {
        case "Sender":
            return [
                {
                    title: "Envíos creados",
                    body: "Consulte y dé seguimiento a los envíos asociados a su wallet.",
                    href: "/envios",
                    label: "Ir a consulta de envíos",
                },
                {
                    title: "Operaciones on-chain",
                    body: "Crear envíos y checkpoints firmados desde la demo técnica.",
                    href: "/demo",
                    label: "Abrir demo",
                },
            ];
        case "Carrier":
            return [
                {
                    title: "Transporte activo",
                    body: "Registre checkpoints de tránsito y entrega según el flujo del programa.",
                    href: "/demo",
                    label: "Demo operaciones",
                },
                {
                    title: "Visibilidad",
                    body: "Consulte envíos donde participe su wallet.",
                    href: "/envios",
                    label: "Consulta pública",
                },
            ];
        case "Hub":
            return [
                {
                    title: "Operaciones de hub",
                    body: "Entradas y salidas de mercancía en el nodo logístico.",
                    href: "/demo",
                    label: "Demo",
                },
            ];
        case "Recipient":
            return [
                {
                    title: "Recepción",
                    body: "Confirme entregas y consulte el historial del envío.",
                    href: "/envios",
                    label: "Consultar envíos",
                },
            ];
        case "Inspector":
            return [
                {
                    title: "Auditoría",
                    body: "Rol de solo lectura: use la consulta pública sin operaciones de firma.",
                    href: "/envios",
                    label: "Consulta pública",
                },
            ];
        default:
            return [
                {
                    title: "Sin rol en backend",
                    body: "Conecte la wallet y complete el registro de actor para ver el panel por rol.",
                    href: "/registro",
                    label: "Ir a registro",
                },
            ];
    }
}

export default function AdminHomePage() {
    const { wallet, role, actorLoading } = useWalletSession();
    const showDemo = canUseOperationsDemoNav(Boolean(wallet), role);
    const cards = roleCards(role);

    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Panel Admin</h1>
                <p className="page-sub">
                    Acciones disponibles según el rol devuelto por el backend para la wallet conectada.
                </p>

                {!wallet && (
                    <p className="text-muted text-sm" role="status">
                        Conecte la wallet desde el encabezado para cargar su rol y opciones.
                    </p>
                )}

                {wallet && actorLoading && (
                    <p className="text-muted text-sm">Cargando rol…</p>
                )}

                {wallet && !actorLoading && (
                    <p className="text-sm">
                        Rol actual:{" "}
                        <strong>{role ?? "—"}</strong>
                    </p>
                )}

                <div className="layout-split layout-split--2-1 mt-2">
                    <div className="space-y-2">
                        {cards.map((c) => (
                            <section key={c.title} className="card">
                                <div className="card__hd">{c.title}</div>
                                <div className="card__bd text-sm">
                                    <p className="mb-2">{c.body}</p>
                                    {c.href && c.label && (
                                        <Link prefetch={false} className="btn btn--secondary btn--sm" href={c.href}>
                                            {c.label}
                                        </Link>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                    <div>
                        <section className="card">
                            <div className="card__hd">Accesos rápidos</div>
                            <div className="card__bd text-sm space-y-2">
                                <Link prefetch={false} className="btn btn--ghost btn--sm" href="/consola">
                                    Consola del sistema
                                </Link>
                                <Link prefetch={false} className="btn btn--ghost btn--sm" href="/sistema">
                                    Red y programa (.env)
                                </Link>
                                {showDemo ? (
                                    <Link prefetch={false} className="btn btn--ghost btn--sm" href="/demo">
                                        Demo on-chain
                                    </Link>
                                ) : (
                                    <p className="text-muted mb-0">
                                        Demo on-chain no aplica a su rol (Inspector) o sin wallet.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
