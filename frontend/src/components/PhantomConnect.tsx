"use client";

import { useCallback, useEffect, useState } from "react";

import { formatPhantomConnectError, getPhantom } from "@/lib/wallet/phantom";

export type PhantomConnectProps = {
    /** Se invoca cuando cambia la clave tras connect/disconnect */
    onPublicKeyChange?: (address: string | null) => void;
};

/** Conector Phantom mínimo (Etapa 0–1 — el backend no firma nunca). */
export function PhantomConnect({ onPublicKeyChange }: PhantomConnectProps) {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onPublicKeyChange?.(publicKey);
    }, [publicKey, onPublicKeyChange]);

    const onConnect = useCallback(async () => {
        setError(null);
        const p = getPhantom();
        if (!p?.isPhantom) {
            setError(
                "Phantom no encontrado. Instala la extensión y recarga; en Firefox usa phantom.app.",
            );
            return;
        }
        try {
            const out = await p.connect({ onlyIfTrusted: false });
            setPublicKey(out.publicKey.toBase58());
        } catch (e) {
            setError(formatPhantomConnectError(e));
        }
    }, []);

    const onDisconnect = useCallback(async () => {
        setError(null);
        const p = getPhantom();
        if (p?.disconnect) {
            await p.disconnect().catch(() => undefined);
        }
        setPublicKey(null);
    }, []);

    return (
        <div
            className="space-y-3"
            data-testid="phantom-connect"
            suppressHydrationWarning
        >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Phantom wallet</h2>
            {publicKey ? (
                <>
                    <p className="text-sm text-muted">Clave conectada:</p>
                    <p
                        className="mono break-all text-sm text-[var(--color-text)]"
                        data-testid="wallet-pubkey"
                    >
                        {publicKey}
                    </p>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={onDisconnect}
                    >
                        Desconectar
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={onConnect}
                    className="btn btn--primary"
                    data-testid="phantom-connect-button"
                >
                    Conectar Phantom
                </button>
            )}
            {error ? (
                <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }} data-testid="phantom-error">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
