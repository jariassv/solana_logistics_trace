"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ShipmentTracker } from "@/components/panel/ShipmentTracker";
import { getPublicConfig } from "@/lib/env";

type SearchMode = "sender" | "id";

export default function PublicEnviosPage() {
    const router = useRouter();
    const { apiBaseUrl } = getPublicConfig();
    const [mode, setMode] = useState<SearchMode>("sender");
    const [senderInput, setSenderInput] = useState("");
    const [listWallet, setListWallet] = useState<string | null>(null);
    const [shipmentIdInput, setShipmentIdInput] = useState("");
    const [participantWallet, setParticipantWallet] = useState("");

    const onSearchBySender = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const w = senderInput.trim();
            setListWallet(w.length > 0 ? w : null);
        },
        [senderInput],
    );

    const onOpenById = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const id = shipmentIdInput.trim();
            const w = participantWallet.trim();
            if (!id || !w) {
                return;
            }
            router.push(`/envios/${encodeURIComponent(id)}?wallet=${encodeURIComponent(w)}`);
        },
        [router, shipmentIdInput, participantWallet],
    );

    return (
        <main className="page-main">
            <div className="shell">
                <h1 className="page-title">Consulta pública de envíos</h1>
                <p className="page-sub">
                    Busque por wallet del remitente (listado) o por identificador del envío con una
                    wallet participante autorizada en el backend.
                </p>

                {!apiBaseUrl && (
                    <p className="text-muted text-sm" role="status">
                        Configure <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>.
                    </p>
                )}

                <div className="card mt-2">
                    <div className="card__hd">Criterios de búsqueda</div>
                    <div className="card__bd">
                        <div className="flex gap-2 flex-wrap mb-3">
                            <button
                                type="button"
                                className={`btn btn--sm ${mode === "sender" ? "btn--primary" : "btn--ghost"}`}
                                onClick={() => setMode("sender")}
                            >
                                Por remitente
                            </button>
                            <button
                                type="button"
                                className={`btn btn--sm ${mode === "id" ? "btn--primary" : "btn--ghost"}`}
                                onClick={() => setMode("id")}
                            >
                                Por ID de envío
                            </button>
                        </div>

                        {mode === "sender" ? (
                            <form className="space-y-2" onSubmit={onSearchBySender}>
                                <label className="text-sm block" htmlFor="sender-wallet">
                                    Wallet pública del remitente (base58)
                                </label>
                                <input
                                    id="sender-wallet"
                                    className="w-full max-w-xl mono text-sm p-2 border rounded-md border-[var(--color-border,#e5e7eb)]"
                                    placeholder="Ej. clave pública de 32 bytes en base58"
                                    value={senderInput}
                                    onChange={(e) => setSenderInput(e.target.value)}
                                />
                                <button type="submit" className="btn btn--primary btn--sm">
                                    Consultar listado
                                </button>
                            </form>
                        ) : (
                            <form className="space-y-2" onSubmit={onOpenById}>
                                <label className="text-sm block" htmlFor="ship-id">
                                    UUID del envío
                                </label>
                                <input
                                    id="ship-id"
                                    className="w-full max-w-xl mono text-sm p-2 border rounded-md border-[var(--color-border,#e5e7eb)]"
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    value={shipmentIdInput}
                                    onChange={(e) => setShipmentIdInput(e.target.value)}
                                />
                                <label className="text-sm block" htmlFor="part-wallet">
                                    Wallet participante (requerida por la API)
                                </label>
                                <input
                                    id="part-wallet"
                                    className="w-full max-w-xl mono text-sm p-2 border rounded-md border-[var(--color-border,#e5e7eb)]"
                                    placeholder="Wallet con permiso de lectura sobre el envío"
                                    value={participantWallet}
                                    onChange={(e) => setParticipantWallet(e.target.value)}
                                />
                                <button type="submit" className="btn btn--primary btn--sm">
                                    Ver detalle y línea de tiempo
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {apiBaseUrl && mode === "sender" && listWallet && (
                    <div className="mt-2">
                        <ShipmentTracker apiBaseUrl={apiBaseUrl} wallet={listWallet} />
                    </div>
                )}

                <p className="text-sm text-muted mt-3 mb-0">
                    ¿Operación con wallet conectada? Ir a{" "}
                    <Link prefetch={false} href="/admin">
                        Admin
                    </Link>
                    .
                </p>
            </div>
        </main>
    );
}
