"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";

import { useShipmentsList } from "@/lib/api/useShipmentsList";
import { shipmentPdaFromOnChainId } from "@/lib/admin/shipmentPda";
import { getPublicConfig } from "@/lib/env";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { actorPda } from "@/lib/solana/pdas";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

export function useAdminState() {
    const cfg = useMemo(() => getPublicConfig(), []);
    const programId = cfg.programPublicKey;
    const apiBase = cfg.apiBaseUrl.trim() !== "" ? cfg.apiBaseUrl : undefined;

    const { wallet, role, actorLoading } = useWalletSession();
    const connection = useMemo(() => new Connection(cfg.rpcUrl, "confirmed"), [cfg.rpcUrl]);
    const payer = useMemo(() => (wallet ? new PublicKey(wallet) : null), [wallet]);

    const [prog, setProg] = useState<Awaited<ReturnType<typeof fetchProgramConfig>>>(null);
    const [actorOnChain, setActorOnChain] = useState<boolean | null>(null);

    const { rows, loading: shipmentsLoading, reload: reloadShipments } = useShipmentsList(
        apiBase,
        wallet,
    );

    const refreshProgram = useCallback(async () => {
        if (!programId) {
            setProg(null);
            return;
        }
        const res = await fetchProgramConfig(connection, programId);
        setProg(res);
    }, [connection, programId]);

    const refreshActorOnChain = useCallback(async () => {
        if (!programId || !payer) {
            setActorOnChain(null);
            return;
        }
        const [pda] = actorPda(programId, payer);
        try {
            const acc = await connection.getAccountInfo(pda, "confirmed");
            setActorOnChain(Boolean(acc?.data?.length));
        } catch {
            setActorOnChain(null);
        }
    }, [connection, programId, payer]);

    const refreshAll = useCallback(async () => {
        await Promise.all([refreshProgram(), refreshActorOnChain(), reloadShipments()]);
    }, [refreshProgram, refreshActorOnChain, reloadShipments]);

    useEffect(() => {
        let cancel = false;
        void (async () => {
            if (!programId) {
                if (!cancel) {
                    setProg(null);
                }
                return;
            }
            const res = await fetchProgramConfig(connection, programId);
            if (!cancel) {
                setProg(res);
            }
        })();
        return () => {
            cancel = true;
        };
    }, [connection, programId]);

    useEffect(() => {
        void Promise.resolve().then(() => void refreshActorOnChain());
    }, [refreshActorOnChain, prog]);

    const resolveShipmentPda = useCallback(
        (onChainShipmentId: string) => {
            if (!programId) {
                return null;
            }
            return shipmentPdaFromOnChainId(programId, onChainShipmentId);
        },
        [programId],
    );

    return {
        cfg,
        programId,
        connection,
        payer,
        wallet,
        role,
        actorLoading,
        prog,
        programActive: Boolean(prog),
        actorOnChain,
        rows,
        shipmentsLoading,
        refreshAll,
        resolveShipmentPda,
    };
}

/** @deprecated Use `useAdminState`. */
export const useAdminProcessState = useAdminState;
