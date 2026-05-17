"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";

import { apiBaseHasV1Prefix, normalizeApiBaseUrl } from "@/lib/api/backendConnectivity";
import { loadActorRoleSelectOptions } from "@/lib/api/catalogs";
import { postActorsSync } from "@/lib/api/sync";
import { getPublicConfig } from "@/lib/env";
import {
    adminHints,
    syncSuccessCopy,
    userFacingChainError,
    userMessageForSyncFailure,
} from "@/lib/panel/etapa1UserMessages";
import type { CatalogOptionRow } from "@/lib/solana/catalogCodeMap";
import { confirmSerializedTx } from "@/lib/solana/confirmSerializedTx";
import type { ActorRoleCode } from "@/lib/solana/ix";
import { ActorRoleCode as Role } from "@/lib/solana/ix";
import { createRegisterActorIx } from "@/lib/solana/instructions";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { actorPda } from "@/lib/solana/pdas";
import { useWalletSession } from "@/lib/wallet/WalletSessionContext";

const FALLBACK_ACTOR_ROWS: CatalogOptionRow<ActorRoleCode>[] = [
    { code: "Sender", label: "Sender", value: Role.Sender },
    { code: "Carrier", label: "Carrier", value: Role.Carrier },
    { code: "Hub", label: "Hub", value: Role.Hub },
    { code: "Recipient", label: "Recipient", value: Role.Recipient },
    { code: "Inspector", label: "Inspector", value: Role.Inspector },
];

export type ActorRegistrationFormProps = {
    /** Sin card exterior de página /registro. */
    embedded?: boolean;
    onSuccess?: () => void;
    /** Si el programa no está activo, abrir paso de inicialización en admin. */
    onOpenInitialize?: () => void;
};

export function ActorRegistrationForm({
    embedded = false,
    onSuccess,
    onOpenInitialize,
}: ActorRegistrationFormProps = {}) {
    const cfg = useMemo(() => getPublicConfig(), []);
    const programId = cfg.programPublicKey;
    const apiBaseTrimmed = useMemo(
        () => normalizeApiBaseUrl(cfg.apiBaseUrl ?? ""),
        [cfg.apiBaseUrl],
    );
    const apiBaseWellFormed = useMemo(
        () => apiBaseTrimmed !== "" && apiBaseHasV1Prefix(apiBaseTrimmed),
        [apiBaseTrimmed],
    );

    const connection = useMemo(() => new Connection(cfg.rpcUrl, "confirmed"), [cfg.rpcUrl]);
    const { wallet, refreshActor } = useWalletSession();
    const payer = useMemo(() => (wallet ? new PublicKey(wallet) : null), [wallet]);

    const [prog, setProg] = useState<Awaited<ReturnType<typeof fetchProgramConfig>>>(null);
    const [role, setRole] = useState<ActorRoleCode>(Role.Sender);
    const [actorName, setActorName] = useState("");
    const [actorLocation, setActorLocation] = useState("");
    const [apiActorRows, setApiActorRows] = useState<CatalogOptionRow<ActorRoleCode>[] | null>(
        null,
    );
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(
        null,
    );
    const [actorAccountExists, setActorAccountExists] = useState<boolean | null>(null);

    useEffect(() => {
        let cancel = false;
        if (!programId) {
            queueMicrotask(() => {
                if (!cancel) {
                    setProg(null);
                }
            });
            return () => {
                cancel = true;
            };
        }
        void fetchProgramConfig(connection, programId).then((r) => {
            if (!cancel) {
                setProg(r);
            }
        });
        return () => {
            cancel = true;
        };
    }, [connection, programId]);

    useEffect(() => {
        let cancel = false;
        if (!apiBaseTrimmed || !apiBaseWellFormed) {
            queueMicrotask(() => {
                if (!cancel) {
                    setApiActorRows(null);
                    setCatalogsLoading(false);
                }
            });
            return () => {
                cancel = true;
            };
        }
        queueMicrotask(() => {
            if (!cancel) {
                setCatalogsLoading(true);
            }
        });
        void (async () => {
            try {
                const actorOpts = await loadActorRoleSelectOptions(apiBaseTrimmed);
                if (!cancel) {
                    setApiActorRows(actorOpts.length > 0 ? actorOpts : null);
                }
            } catch {
                if (!cancel) {
                    setApiActorRows(null);
                }
            } finally {
                if (!cancel) {
                    setCatalogsLoading(false);
                }
            }
        })();
        return () => {
            cancel = true;
        };
    }, [apiBaseTrimmed, apiBaseWellFormed]);

    const actorRows = apiActorRows ?? FALLBACK_ACTOR_ROWS;

    useEffect(() => {
        const rows = apiActorRows;
        if (!rows?.length) {
            return;
        }
        queueMicrotask(() => {
            setRole((prev) => (rows.some((r) => r.value === prev) ? prev : rows[0]!.value));
        });
    }, [apiActorRows]);

    useEffect(() => {
        let cancel = false;
        if (!programId || !payer) {
            queueMicrotask(() => {
                if (!cancel) {
                    setActorAccountExists(null);
                }
            });
            return () => {
                cancel = true;
            };
        }
        void (async () => {
            const [pda] = actorPda(programId, payer);
            try {
                const acc = await connection.getAccountInfo(pda, "confirmed");
                if (!cancel) {
                    setActorAccountExists(Boolean(acc?.data?.length));
                }
            } catch {
                if (!cancel) {
                    setActorAccountExists(null);
                }
            }
        })();
        return () => {
            cancel = true;
        };
    }, [connection, programId, payer, prog]);

    const refreshProg = useCallback(async () => {
        if (!programId) {
            setProg(null);
            return;
        }
        const res = await fetchProgramConfig(connection, programId);
        setProg(res);
    }, [connection, programId]);

    const hintText = useMemo(() => {
        if (!programId) {
            return adminHints.programNotConfigured;
        }
        if (!payer) {
            return adminHints.walletConnect;
        }
        if (!prog) {
            return adminHints.runInitializeFirst;
        }
        if (actorAccountExists === true) {
            return "Esta cartera ya tiene un actor en esta red.";
        }
        if (!actorName.trim()) {
            return "Indique un nombre.";
        }
        return null;
    }, [programId, payer, prog, actorAccountExists, actorName]);

    const submitDisabled =
        busy ||
        !programId ||
        !payer ||
        !prog ||
        actorAccountExists === true ||
        !actorName.trim();

    const onSubmit = useCallback(async () => {
        if (!programId || !payer || !prog || actorAccountExists === true || !actorName.trim()) {
            return;
        }
        setBanner(null);
        setBusy(true);
        try {
            const [actorPk] = actorPda(programId, payer);
            const existing = await connection.getAccountInfo(actorPk, "confirmed");
            if (existing?.data?.length) {
                throw new Error("Actor ya registrado para esta cartera en esta red.");
            }
            const sig = await confirmSerializedTx(
                connection,
                payer,
                createRegisterActorIx({
                    programId,
                    authority: payer,
                    role,
                    name: actorName.trim(),
                    location: actorLocation.trim(),
                }),
            );
            let syncOk = true;
            if (cfg.apiBaseUrl?.trim()) {
                const r = await postActorsSync(cfg.apiBaseUrl, { tx_hash: sig });
                if (r.ok) {
                    setBanner({ kind: "ok", text: syncSuccessCopy.actor });
                } else {
                    syncOk = false;
                    setBanner({
                        kind: "err",
                        text: userMessageForSyncFailure("el actor", r.status, r.json),
                    });
                }
            } else {
                setBanner({
                    kind: "info",
                    text: "Registro en cadena completado. Configure la API para sincronizar con el backend.",
                });
            }
            await refreshProg();
            setActorAccountExists(true);
            await refreshActor();
            if (syncOk) {
                onSuccess?.();
            }
        } catch (e) {
            setBanner({ kind: "err", text: userFacingChainError("register_actor", e) });
        } finally {
            setBusy(false);
        }
    }, [
        programId,
        payer,
        prog,
        actorAccountExists,
        connection,
        role,
        actorName,
        actorLocation,
        cfg.apiBaseUrl,
        refreshProg,
        refreshActor,
        onSuccess,
    ]);

    const formEl = (
        <form
            className={embedded ? "admin-form" : "registro-form__inner"}
                onSubmit={(e) => {
                    e.preventDefault();
                    void onSubmit();
                }}
            >
            {wallet ? (
                <p className="registro-form__wallet text-sm mb-2" role="status">
                    Se registrará la wallet conectada en Phantom:{" "}
                    <span className="mono break-all">{wallet}</span>
                    <span className="text-muted">
                        {" "}
                        (cada wallet solo puede tener un actor; use otra cuenta en Phantom para
                        registrar otra)
                    </span>
                </p>
            ) : null}
                <div className="form-group">
                    <label htmlFor="registro-role">Rol</label>
                    <select
                        id="registro-role"
                        className="select"
                        value={role}
                        disabled={catalogsLoading || busy}
                        onChange={(e) => setRole(Number(e.target.value) as ActorRoleCode)}
                    >
                        {actorRows.map((o) => (
                            <option key={o.code} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="registro-nombre">Nombre</label>
                    <input
                        id="registro-nombre"
                        className="input"
                        autoComplete="organization"
                        placeholder="Organización o persona"
                        value={actorName}
                        disabled={busy}
                        onChange={(e) => setActorName(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="registro-ubicacion">Ubicación (opcional)</label>
                    <input
                        id="registro-ubicacion"
                        className="input"
                        autoComplete="off"
                        placeholder="Ciudad, país"
                        value={actorLocation}
                        disabled={busy}
                        onChange={(e) => setActorLocation(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    className={`btn btn--primary btn--block${busy ? " is-busy" : ""}`}
                    disabled={submitDisabled}
                    aria-busy={busy}
                >
                    {busy ? "Firmando…" : "Registrar actor"}
                </button>
                {hintText && !busy ? (
                    <p className="registro-form__hint text-sm text-muted mb-0">{hintText}</p>
                ) : null}
                {!prog && payer && programId ? (
                    <p className="registro-form__aux text-xs text-muted mb-0">
                        {onOpenInitialize ? (
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={onOpenInitialize}
                            >
                                Activar programa (una vez)
                            </button>
                        ) : (
                            <a className="btn btn--ghost btn--sm" href="/consola">
                                Activar programa en Consola
                            </a>
                        )}
                    </p>
                ) : null}
                {banner ? (
                    <p
                        className={`registro-form__banner text-sm mb-0${banner.kind === "err" ? " registro-form__banner--err" : ""}`}
                        role={banner.kind === "err" ? "alert" : "status"}
                    >
                        {banner.text}
                    </p>
                ) : null}
        </form>
    );

    if (embedded) {
        return formEl;
    }

    return (
        <div className="registro-form" data-testid="actor-registration-form">
            {formEl}
        </div>
    );
}
