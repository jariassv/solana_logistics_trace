import { Suspense } from "react";

import { PublicShipmentDetailClient } from "./PublicShipmentDetailClient";

export default function PublicShipmentDetailPage() {
    return (
        <Suspense
            fallback={
                <main className="page-main">
                    <div className="shell">
                        <p className="text-muted text-sm">Cargando…</p>
                    </div>
                </main>
            }
        >
            <PublicShipmentDetailClient />
        </Suspense>
    );
}
