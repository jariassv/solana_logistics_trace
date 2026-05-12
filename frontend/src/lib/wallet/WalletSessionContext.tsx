"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { getActorMe } from "@/lib/api/shipments";
import { getPublicConfig } from "@/lib/env";
import { formatPhantomConnectError, getPhantom } from "@/lib/wallet/phantom";

export type WalletSessionContextValue = {
    wallet: string | null;
    role: string | null;
    actorLoading: boolean;
    connectError: string | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
};

const WalletSessionContext = createContext<WalletSessionContextValue | null>(null);

export function useWalletSession(): WalletSessionContextValue {
    const ctx = useContext(WalletSessionContext);
    if (!ctx) {
        throw new Error("useWalletSession debe usarse dentro de WalletSessionProvider");
    }
    return ctx;
}

export function WalletSessionProvider({ children }: { children: ReactNode }) {
    const { apiBaseUrl } = getPublicConfig();
    const [wallet, setWallet] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [actorLoading, setActorLoading] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);

    const trySilentConnect = useCallback(async () => {
        const p = getPhantom();
        if (!p?.isPhantom || !p.connect) {
            return;
        }
        try {
            const out = await p.connect({ onlyIfTrusted: true });
            setWallet(out.publicKey.toBase58());
        } catch {
            /* sin sesión previa de confianza */
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => void trySilentConnect());
    }, [trySilentConnect]);

    useEffect(() => {
        if (!apiBaseUrl || !wallet) {
            void Promise.resolve().then(() => {
                setRole(null);
                setActorLoading(false);
            });
            return;
        }
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) {
                setActorLoading(true);
            }
        });
        void (async () => {
            const res = await getActorMe(apiBaseUrl, wallet);
            if (cancelled) {
                return;
            }
            setActorLoading(false);
            if (res.ok) {
                setRole(res.data.role);
            } else {
                setRole(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [apiBaseUrl, wallet]);

    const connect = useCallback(async () => {
        setConnectError(null);
        const p = getPhantom();
        if (!p?.isPhantom || !p.connect) {
            setConnectError(
                "Phantom no encontrado. Instala la extensión y recarga; en Firefox usa phantom.app.",
            );
            return;
        }
        try {
            const out = await p.connect({ onlyIfTrusted: false });
            setWallet(out.publicKey.toBase58());
        } catch (e) {
            setConnectError(formatPhantomConnectError(e));
        }
    }, []);

    const disconnect = useCallback(async () => {
        setConnectError(null);
        const p = getPhantom();
        if (p?.disconnect) {
            await p.disconnect().catch(() => undefined);
        }
        setWallet(null);
        setRole(null);
    }, []);

    const value = useMemo<WalletSessionContextValue>(
        () => ({
            wallet,
            role,
            actorLoading,
            connectError,
            connect,
            disconnect,
        }),
        [wallet, role, actorLoading, connectError, connect, disconnect],
    );

    return (
        <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>
    );
}
