"use client";

import { useCallback, useEffect } from "react";

import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export type PhantomConnectProps = {
    /** Se invoca cuando cambia la clave tras connect/disconnect */
    onPublicKeyChange?: (address: string | null) => void;
};

/**
 * Bloque informativo de wallet: delega en la sesión global (mismo flujo que el header).
 */
export function PhantomConnect({ onPublicKeyChange }: PhantomConnectProps) {
    const { wallet, connectError, connect, disconnect } = useWalletSession();

    useEffect(() => {
        onPublicKeyChange?.(wallet);
    }, [wallet, onPublicKeyChange]);

    const onConnect = useCallback(async () => {
        await connect();
    }, [connect]);

    const onDisconnect = useCallback(async () => {
        await disconnect();
    }, [disconnect]);

    return (
        <div
            className="space-y-3"
            data-testid="phantom-connect"
            suppressHydrationWarning
        >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Phantom wallet</h2>
            {wallet ? (
                <>
                    <p className="text-sm text-muted">Clave conectada:</p>
                    <p
                        className="mono break-all text-sm text-[var(--color-text)]"
                        data-testid="wallet-pubkey"
                    >
                        {wallet}
                    </p>
                    <p className="text-xs text-muted mb-0">
                        También puedes desconectar desde la barra superior.
                    </p>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => void onDisconnect()}
                    >
                        Desconectar
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => void onConnect()}
                    className="btn btn--primary"
                    data-testid="phantom-connect-button"
                >
                    Conectar Phantom
                </button>
            )}
            {connectError ? (
                <p
                    role="alert"
                    className="text-sm"
                    style={{ color: "var(--color-danger)" }}
                    data-testid="phantom-error"
                >
                    {connectError}
                </p>
            ) : null}
        </div>
    );
}
