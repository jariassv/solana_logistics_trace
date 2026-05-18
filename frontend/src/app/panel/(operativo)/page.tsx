import { PanelRoleDashboard } from "@/components/panel/PanelRoleDashboard";

/**
 * Resumen operativo por rol: KPIs desde la API y listado de envíos de la wallet.
 */
export default function PanelPage() {
    return (
        <main className="page-main">
            <div className="shell">
                <PanelRoleDashboard />
            </div>
        </main>
    );
}
