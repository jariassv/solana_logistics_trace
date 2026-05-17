"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ClusterPanel } from "@/components/ClusterPanel";
import { InitializeProgramPanel } from "@/components/consola/InitializeProgramPanel";
import { adminHints } from "@/lib/panel/etapa1UserMessages";
import { apiOriginFromApiBase, getPublicConfig } from "@/lib/env";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

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

/** Consola del dueño: salud HTTP, RPC, activación on-chain del programa y clúster. */
export function OwnerConsoleClient() {
    const cfg = getPublicConfig();
    const { apiBaseUrl, network, rpcUrl, programId, programPublicKey } = cfg;
    const origin = apiBaseUrl ? apiOriginFromApiBase(apiBaseUrl) : "";
    const { wallet } = useWalletSession();

    const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);
    const payer = useMemo(
        () => (wallet ? new PublicKey(wallet) : null),
        [wallet],
    );

    const [healthText, setHealthText] = useState("—");
    const [rpcApiText, setRpcApiText] = useState("—");
    const [programActive, setProgramActive] = useState(false);
    const [programLoading, setProgramLoading] = useState(false);

    const refreshProgram = useCallback(async () => {
        if (!programPublicKey) {
            setProgramActive(false);
            return;
        }
        setProgramLoading(true);
        try {
            const res = await fetchProgramConfig(connection, programPublicKey);
            setProgramActive(Boolean(res));
        } catch {
            setProgramActive(false);
        } finally {
            setProgramLoading(false);
        }
    }, [connection, programPublicKey]);

    useEffect(() => {
        void Promise.resolve().then(() => void refreshProgram());
    }, [refreshProgram]);

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
        <div className="owner-console-grid" aria-label="Estado del sistema">
            <section className="card" aria-label="Activación del programa">
                <div className="card__hd">Programa on-chain</div>
                <div className="card__bd text-sm space-y-2">
                    <p className="mb-0">
                        Inicializa la cuenta <span className="mono">ProgramConfig</span> tras{" "}
                        <span className="mono">anchor deploy</span>. Operación de administración
                        general (no depende del rol operativo).
                    </p>
                    {!programPublicKey ? (
                        <p className="text-muted mb-0">{adminHints.programNotConfigured}</p>
                    ) : !wallet ? (
                        <p className="text-muted mb-0">{adminHints.walletConnect}</p>
                    ) : programLoading ? (
                        <p className="text-muted mb-0">Comprobando estado del programa…</p>
                    ) : (
                        <InitializeProgramPanel
                            connection={connection}
                            programId={programPublicKey}
                            payer={payer!}
                            programActive={programActive}
                            onSuccess={() => void refreshProgram()}
                        />
                    )}
                </div>
            </section>
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
