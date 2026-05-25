"use client";

import type { ReactNode } from "react";

import { useConsolaAccess } from "@/lib/consola/useConsolaAccess";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export type ConsolaPageGateProps = {
    children: ReactNode;
};

export function ConsolaPageGate({ children }: ConsolaPageGateProps) {
    const { wallet } = useWalletSession();
    const { canAccess, loading, programActive, programAuthority } = useConsolaAccess();

    if (loading) {
        return <p className="text-muted text-sm">Comprobando acceso a la consola…</p>;
    }

    if (!wallet) {
        return (
            <p className="text-sm mb-0" role="status">
                Conecte la wallet para acceder a la consola del sistema.
            </p>
        );
    }

    if (!canAccess) {
        return (
            <p className="text-sm mb-0" role="status">
                El programa on-chain ya está activo. Solo la cuenta que lo inicializó (
                <span className="mono text-xs">{programAuthority ?? "—"}</span>) puede usar esta
                consola.
            </p>
        );
    }

    if (!programActive) {
        return (
            <>
                <p className="text-sm text-muted mb-3" role="status">
                    El programa aún no está activo. Puede inicializarlo con la wallet conectada.
                </p>
                {children}
            </>
        );
    }

    return <>{children}</>;
}
