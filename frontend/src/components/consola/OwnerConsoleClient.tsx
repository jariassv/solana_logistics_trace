"use client";

import { useEffect, useState } from "react";

import { ClusterPanel } from "@/components/ClusterPanel";
import { apiOriginFromApiBase, getPublicConfig } from "@/lib/env";

type HealthJson = {
    status?: string;
    database?: string;
};

type SolanaHealthJson = {
    rpc_health?: string;
};

function joinApiPath(apiBaseUrl: string, segment: string): string {
    const base = apiBaseUrl.replace(/\/+$/, "");
    const path = segment.replace(/^\/+/, "");
    return `${base}/${path}`;
}

/** Consola del dueño: salud HTTP del backend + RPC vía API y panel de red. */
export function OwnerConsoleClient() {
    const cfg = getPublicConfig();
    const { apiBaseUrl, network, rpcUrl, programId } = cfg;
    const origin = apiBaseUrl ? apiOriginFromApiBase(apiBaseUrl) : "";
    const [healthText, setHealthText] = useState("—");
    const [rpcApiText, setRpcApiText] = useState("—");

    useEffect(() => {
        if (!apiBaseUrl || !origin) {
            void Promise.resolve().then(() => {
                setHealthText("Sin API base");
                setRpcApiText("—");
            });
            return;
        }
        let cancel = false;
        void Promise.resolve().then(async () => {
            try {
                const r = await fetch(`${origin}/health`, { headers: { Accept: "application/json" } });
                const j = (await r.json()) as HealthJson;
                if (!cancel) {
                    setHealthText(
                        r.ok
                            ? `${j.status ?? "ok"} · DB ${j.database ?? "?"}`
                            : `HTTP ${r.status}`,
                    );
                }
            } catch {
                if (!cancel) {
                    setHealthText("No responde");
                }
            }
            try {
                const r2 = await fetch(joinApiPath(apiBaseUrl, "solana/health"), {
                    headers: { Accept: "application/json" },
                });
                const j2 = (await r2.json()) as SolanaHealthJson;
                if (!cancel) {
                    setRpcApiText(
                        r2.ok ? (j2.rpc_health ?? "ok") : `HTTP ${r2.status}`,
                    );
                }
            } catch {
                if (!cancel) {
                    setRpcApiText("No responde");
                }
            }
        });
        return () => {
            cancel = true;
        };
    }, [apiBaseUrl, origin]);

    return (
        <div style={{ display: "grid", gap: "1.25rem", maxWidth: "48rem" }}>
            <section className="card" aria-label="Backend">
                <div className="card__hd">Backend</div>
                <div className="card__bd text-sm space-y-2">
                    <p className="mb-0">
                        <strong>GET /health</strong> en{" "}
                        <span className="mono text-xs break-all">{origin || "—"}</span>
                    </p>
                    <p className="mono text-sm mb-0" data-testid="owner-console-health">
                        {healthText}
                    </p>
                </div>
            </section>
            <section className="card" aria-label="Blockchain vía API">
                <div className="card__hd">Blockchain (API)</div>
                <div className="card__bd text-sm space-y-2">
                    <p className="mb-0">
                        <strong>GET /api/v1/solana/health</strong> — estado RPC usado por el backend.
                    </p>
                    <p className="mono text-sm mb-0" data-testid="owner-console-rpc-api">
                        {rpcApiText}
                    </p>
                </div>
            </section>
            <ClusterPanel network={network} rpcUrl={rpcUrl} programId={programId} />
        </div>
    );
}
