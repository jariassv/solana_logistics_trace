import { OwnerConsoleClient } from "@/components/consola/OwnerConsoleClient";

export default function ConsolaPage() {
    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Consola del sistema</h1>
                <p className="page-sub">
                    Vista operativa para el administrador general: disponibilidad del backend,
                    salud RPC visto desde la API y parámetros públicos de red.
                </p>
                <OwnerConsoleClient />
            </div>
        </main>
    );
}
