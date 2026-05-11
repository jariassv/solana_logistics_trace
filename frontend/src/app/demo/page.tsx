import type { Metadata } from "next";

import { Etapa1DemoIsland } from "./Etapa1DemoIsland";

export const metadata: Metadata = {
    title: "Operaciones de trazabilidad · TraceSol Logistics",
};

export default function DemoPage() {
    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Operaciones de trazabilidad</h1>
                <p className="page-sub">
                    Alta de actores, envíos y eventos logísticos con replicación al sistema central.
                </p>
                <Etapa1DemoIsland />
            </div>
        </main>
    );
}
