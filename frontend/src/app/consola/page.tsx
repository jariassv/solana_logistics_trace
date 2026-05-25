import Link from "next/link";

import { ConsolaPageGate } from "@/components/consola/ConsolaPageGate";
import { OwnerConsoleClient } from "@/components/consola/OwnerConsoleClient";
import { IconRadio } from "@/components/ui/TraceIcons";

export default function ConsolaPage() {
    return (
        <main className="page-main consola-page">
            <div className="shell">
                <header className="consola-page__header">
                    <p className="consola-page__eyebrow">
                        <IconRadio className="trace-icon consola-page__eyebrow-icon" />
                        Administración · Infraestructura
                    </p>
                    <h1 className="consola-page__title">Consola del sistema</h1>
                    <p className="consola-page__lead">
                        Supervise la salud del backend, la conexión RPC y la activación del programa
                        on-chain. Vista para el administrador general antes de habilitar registro y
                        operación logística.
                    </p>
                    <div className="consola-page__links">
                        <Link prefetch={false} className="btn btn--ghost btn--sm" href="/">
                            Inicio
                        </Link>
                        <Link prefetch={false} className="btn btn--ghost btn--sm" href="/sistema">
                            Sistema y red
                        </Link>
                        <Link prefetch={false} className="btn btn--ghost btn--sm" href="/admin">
                            Panel Admin
                        </Link>
                    </div>
                </header>
                <ConsolaPageGate>
                    <OwnerConsoleClient />
                </ConsolaPageGate>
            </div>
        </main>
    );
}
