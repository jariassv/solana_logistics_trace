"use client";

import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

function shortPk(pk: string): string {
    if (pk.length <= 12) {
        return pk;
    }
    return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

/** Nota en /sistema: la wallet vive en el header; evita un segundo flujo de conexión. */
export function SistemaWalletNote() {
    const { wallet, role, actorLoading } = useWalletSession();

    return (
        <div className="text-sm space-y-2">
            {wallet ? (
                <>
                    <p className="mb-0">
                        Wallet activa:{" "}
                        <span className="mono" title={wallet}>
                            {shortPk(wallet)}
                        </span>
                    </p>
                    {actorLoading ? (
                        <p className="text-muted mb-0">Consultando rol en el backend…</p>
                    ) : role ? (
                        <p className="mb-0">
                            Rol en backend: <strong>{role}</strong>
                        </p>
                    ) : (
                        <p className="text-muted mb-0">Sin actor registrado para esta clave.</p>
                    )}
                    <p className="text-muted mb-0">
                        Para conectar otra cuenta usa <strong>Desconectar</strong> en la barra superior.
                    </p>
                </>
            ) : (
                <p className="text-muted mb-0">
                    Usa <strong>Conectar wallet</strong> en la barra superior para firmar y operar en la
                    demo.
                </p>
            )}
        </div>
    );
}
