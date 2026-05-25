"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { canAccessConsola } from "@/lib/consola/access";
import { getPublicConfig } from "@/lib/env";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export function useConsolaAccess() {
    const { wallet } = useWalletSession();
    const { rpcUrl, programPublicKey } = getPublicConfig();
    const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);

    const [programActive, setProgramActive] = useState(false);
    const [programAuthority, setProgramAuthority] = useState<string | null>(null);
    const [loading, setLoading] = useState(Boolean(programPublicKey));

    const refresh = useCallback(async () => {
        if (!programPublicKey) {
            setProgramActive(false);
            setProgramAuthority(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetchProgramConfig(connection, programPublicKey);
            if (res) {
                setProgramActive(true);
                setProgramAuthority(res.decoded.authority.toBase58());
            } else {
                setProgramActive(false);
                setProgramAuthority(null);
            }
        } catch {
            setProgramActive(false);
            setProgramAuthority(null);
        } finally {
            setLoading(false);
        }
    }, [connection, programPublicKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const canAccess = useMemo(
        () =>
            canAccessConsola({
                wallet,
                programActive,
                programAuthority,
            }),
        [wallet, programActive, programAuthority],
    );

    return {
        loading,
        programActive,
        programAuthority,
        canAccess,
        refresh,
        programPublicKey: programPublicKey as PublicKey | null,
    };
}
