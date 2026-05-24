"use client";

import { useCallback, useEffect, useState } from "react";
import type { Connection, PublicKey } from "@solana/web3.js";
import { getCarrierActors, type CarrierOption } from "@/lib/api/actors";
import { postAssignCarrierSync } from "@/lib/api/sync";
import { postSyncWithRetry } from "@/lib/api/syncWithRetry";
import { userFacingChainError, userMessageForSyncFailure } from "@/lib/panel/etapa1UserMessages";
import { createAssignCarrierIx } from "@/lib/solana/instructions";
import { confirmSerializedTx } from "@/lib/solana/confirmSerializedTx";

export type AssignCarrierFormProps = {
    apiBaseUrl: string;
    connection: Connection;
    programId: PublicKey;
    sender: PublicKey;
    shipmentPda: PublicKey;
    onSuccess?: () => void;
};

export function AssignCarrierForm({
    apiBaseUrl,
    connection,
    programId,
    sender,
    shipmentPda,
    onSuccess,
}: AssignCarrierFormProps) {
    const [carriers, setCarriers] = useState<CarrierOption[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [selected, setSelected] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoadingList(true);
        void getCarrierActors(apiBaseUrl).then((res) => {
            if (cancelled) {
                return;
            }
            if (res.ok) {
                setCarriers(res.data);
            } else {
                setError("No se pudo cargar la lista de transportistas.");
            }
            setLoadingList(false);
        });
        return () => {
            cancelled = true;
        };
    }, [apiBaseUrl]);

    const onSubmit = useCallback(async () => {
        if (!selected) {
            setError("Seleccione un transportista registrado.");
            return;
        }
        setBusy(true);
        setError(null);
        setStatus("Firmando asignación on-chain…");
        try {
            const carrierPk = new PublicKey(selected);
            const ix = createAssignCarrierIx({
                programId,
                sender,
                shipment: shipmentPda,
                carrier: carrierPk,
            });
            const sig = await confirmSerializedTx(connection, sender, ix);

            setStatus("Sincronizando con el backend…");
            const sync = await postSyncWithRetry(() =>
                postAssignCarrierSync(apiBaseUrl, { tx_hash: sig }),
            );
            if (!sync.ok) {
                throw new Error(userMessageForSyncFailure(sync));
            }

            setStatus("Transportista asignado.");
            onSuccess?.();
        } catch (e) {
            setError(userFacingChainError(e));
            setStatus(null);
        } finally {
            setBusy(false);
        }
    }, [apiBaseUrl, connection, onSuccess, programId, selected, sender, shipmentPda]);

    return (
        <div className="assign-carrier-form">
            <p className="text-sm text-muted mb-3">
                Solo usted como remitente puede asignar un Carrier registrado en la red. La operación
                queda registrada on-chain.
            </p>
            {loadingList ? (
                <p className="text-sm text-muted">Cargando transportistas…</p>
            ) : carriers.length === 0 ? (
                <p className="text-sm text-muted" role="status">
                    No hay actores Carrier activos. Registre transportistas en{" "}
                    <code>/registro</code> antes de asignar.
                </p>
            ) : (
                <label className="form-field">
                    <span className="form-label">Transportista</span>
                    <select
                        className="form-input"
                        value={selected}
                        disabled={busy}
                        onChange={(e) => setSelected(e.target.value)}
                    >
                        <option value="">— Seleccione —</option>
                        {carriers.map((c) => (
                            <option key={c.wallet} value={c.wallet}>
                                {c.displayLabel}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {error && (
                <p className="text-sm mt-2" role="alert">
                    {error}
                </p>
            )}
            {status && (
                <p className="text-sm text-muted mt-2" role="status">
                    {status}
                </p>
            )}
            <div className="mt-3">
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={busy || loadingList || carriers.length === 0 || !selected}
                    onClick={() => void onSubmit()}
                >
                    {busy ? "Procesando…" : "Asignar on-chain"}
                </button>
            </div>
        </div>
    );
}
