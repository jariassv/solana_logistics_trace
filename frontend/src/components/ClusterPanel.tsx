"use client";

import { useEffect, useState } from "react";

export type ClusterPanelProps = {
    network: string;
    rpcUrl: string;
    programId: string;
};

type VersionPayload = {
    ok?: boolean;
    solanaCore?: string;
    hint?: string;
};

/** Clúster configurado (+ `getVersion` vía proxy same-origin por CORS). */
export function ClusterPanel({ network, rpcUrl, programId }: ClusterPanelProps) {
    const [rpcHint, setRpcHint] = useState<string>("…");

    useEffect(() => {
        let cancel = false;

        fetch("/api/solana/version")
            .then((r) => r.json() as Promise<VersionPayload>)
            .then((data) => {
                if (cancel) {
                    return;
                }
                if (data.ok && data.solanaCore) {
                    setRpcHint(data.solanaCore);
                } else {
                    setRpcHint(data.hint ?? "sin respuesta");
                }
            })
            .catch(() => {
                if (!cancel) {
                    setRpcHint("sin respuesta");
                }
            });

        return () => {
            cancel = true;
        };
    }, []);

    return (
        <section
            className="card"
            aria-label="Solana configurada"
            data-testid="cluster-panel"
            suppressHydrationWarning
        >
            <div className="card__hd">
                <span>Clúster (.env público)</span>
            </div>
            <div className="card__bd">
                <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
                    La red se consulta desde el servidor de Next por CORS. Verifica RPC y programa
                    Id en <code className="mono">.env.local</code>.
                </p>
                <dl style={{ display: "grid", gridTemplateColumns: "min-content 1fr", gap: "0.65rem", fontSize: "0.9rem" }}>
                    <dt className="text-muted">Red</dt>
                    <dd data-testid="cluster-network">{network}</dd>

                    <dt className="text-muted">RPC</dt>
                    <dd className="mono break-all text-xs" data-testid="cluster-rpc">
                        {rpcUrl}
                    </dd>

                    <dt className="text-muted">Program ID</dt>
                    <dd className="mono break-all text-xs" data-testid="cluster-program-id">
                        {programId.trim() !== "" ? programId : "—"}
                    </dd>

                    <dt className="text-muted">solana-core</dt>
                    <dd data-testid="cluster-version-hint">{rpcHint}</dd>
                </dl>
            </div>
        </section>
    );
}
