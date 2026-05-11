"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Connection,
    PublicKey,
    Transaction,
    type TransactionInstruction,
} from "@solana/web3.js";

import {
    apiBaseHasV1Prefix,
    fetchBackendHealth,
    healthCheckUrlFromApiBase,
    normalizeApiBaseUrl,
} from "@/lib/api/backendConnectivity";
import {
    loadActorRoleSelectOptions,
    loadCheckpointSelectOptions,
} from "@/lib/api/catalogs";
import {
    postActorsSync,
    postCheckpointsSync,
    postShipmentsSync,
} from "@/lib/api/sync";
import { getPublicConfig } from "@/lib/env";
import type { CatalogOptionRow } from "@/lib/solana/catalogCodeMap";
import type { ActorRoleCode, CheckpointTypeCode } from "@/lib/solana/ix";
import { ActorRoleCode as Role, CheckpointTypeCode as Cp } from "@/lib/solana/ix";
import {
    createCreateShipmentIx,
    createInitializeIx,
    createRecordCheckpointIx,
    createRegisterActorIx,
} from "@/lib/solana/instructions";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { actorPda, shipmentPda } from "@/lib/solana/pdas";
import { signTransactionWithPhantom } from "@/lib/wallet/phantom";

import { PhantomConnect } from "./PhantomConnect";

/** Mensaje de error de campo o `null` si el valor es una PublicKey válida (no por defecto). */
type PostChainVerifyRegisterActor = {
    type: "register_actor";
    actorsCountBefore: bigint;
    authority: PublicKey;
};

async function logRegisterActorOnChainFollowUp(
    connection: Connection,
    programId: PublicKey,
    verify: PostChainVerifyRegisterActor,
    append: (msg: string) => void,
): Promise<void> {
    const fresh = await fetchProgramConfig(connection, programId);
    if (!fresh) {
        append("register_actor · aviso: no se pudo releer ProgramConfig tras la tx.");
        return;
    }
    const after = fresh.decoded.actorsRegistered;
    const before = verify.actorsCountBefore;
    if (after > before) {
        append(
            `register_actor · on-chain: actorsRegistered=${after} (antes ${before}; +${after - before}).`,
        );
    } else {
        append(
            `register_actor · on-chain: actorsRegistered=${after} (sin cambio respecto a ${before}). Si esperaba un alta nueva, revise la transacción en un explorer.`,
        );
    }

    const [pda] = actorPda(programId, verify.authority);
    const acc = await connection.getAccountInfo(pda, "confirmed");
    if (acc?.data?.length) {
        append(
            `register_actor · cuenta Actor PDA: ${pda.toBase58()} (${acc.data.length} bytes).`,
        );
    } else {
        append(
            `register_actor · aviso: la PDA Actor ${pda.toBase58()} no tiene datos tras la tx (¿instrucción fallida o cuenta no creada?).`,
        );
    }
}

function recipientFieldValidationError(recipientTrimmed: string): string | null {
    if (!recipientTrimmed) {
        return "Indica la PublicKey base58 del destinatario.";
    }
    try {
        const rec = new PublicKey(recipientTrimmed);
        if (rec.equals(PublicKey.default)) {
            return "La clave por defecto del sistema no puede usarse como destinatario.";
        }
        return null;
    } catch {
        return "PublicKey base58 inválida: debe decodificar 32 bytes (suele ser ~43–44 caracteres).";
    }
}

async function confirmSerializedTx(
    connection: Connection,
    payer: PublicKey,
    ix: TransactionInstruction,
): Promise<string> {
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
        feePayer: payer,
        recentBlockhash: latest.blockhash,
    });
    tx.add(ix);
    tx.lastValidBlockHeight = latest.lastValidBlockHeight;

    const signed = await signTransactionWithPhantom(tx);
    const serialized = signed.serialize();

    const signature = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
    });

    await connection.confirmTransaction(
        {
            signature,
            blockhash: latest.blockhash,
            lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed",
    );

    return signature;
}

/** Coincide con seeds `cat_*` y orden Borsh del programa si la API no está disponible. */
const FALLBACK_ACTOR_ROWS: CatalogOptionRow<ActorRoleCode>[] = [
    { code: "Sender", label: "Sender", value: Role.Sender },
    { code: "Carrier", label: "Carrier", value: Role.Carrier },
    { code: "Hub", label: "Hub", value: Role.Hub },
    { code: "Recipient", label: "Recipient", value: Role.Recipient },
    { code: "Inspector", label: "Inspector", value: Role.Inspector },
];

const FALLBACK_CP_ROWS: CatalogOptionRow<CheckpointTypeCode>[] = [
    { code: "Pickup", label: "Pickup", value: Cp.Pickup },
    { code: "HubIn", label: "HubIn", value: Cp.HubIn },
    { code: "HubOut", label: "HubOut", value: Cp.HubOut },
    { code: "Transit", label: "Transit", value: Cp.Transit },
    { code: "DeliveryAttempt", label: "DeliveryAttempt", value: Cp.DeliveryAttempt },
    { code: "Delivered", label: "Delivered", value: Cp.Delivered },
    { code: "SensorData", label: "SensorData", value: Cp.SensorData },
];

export function Etapa1Demo() {
    const cfg = useMemo(() => getPublicConfig(), []);
    const programId = cfg.programPublicKey;
    const apiBaseTrimmed = useMemo(
        () => normalizeApiBaseUrl(cfg.apiBaseUrl ?? ""),
        [cfg.apiBaseUrl],
    );
    const backendHealthUrl = useMemo(
        () => healthCheckUrlFromApiBase(apiBaseTrimmed),
        [apiBaseTrimmed],
    );
    const apiBaseWellFormed = useMemo(
        () =>
            apiBaseTrimmed !== "" &&
            apiBaseHasV1Prefix(apiBaseTrimmed),
        [apiBaseTrimmed],
    );

    const connection = useMemo(
        () => new Connection(cfg.rpcUrl, "confirmed"),
        [cfg.rpcUrl],
    );

    const [wallet, setWallet] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const [prog, setProg] =
        useState<Awaited<ReturnType<typeof fetchProgramConfig>>>(null);

    const [role, setRole] = useState<ActorRoleCode>(Role.Sender);
    const [actorName, setActorName] = useState("Operador Demo");
    const [actorLocation, setActorLocation] = useState("Madrid, ES");

    const [recipient, setRecipient] = useState("");
    const [recipientIssue, setRecipientIssue] = useState<string | null>(null);
    const recipientRef = useRef<HTMLInputElement>(null);
    const [product, setProduct] = useState("Vino Tinto");
    const [origin, setOrigin] = useState("Lisboa · Almacén A");
    const [destination, setDestination] = useState("Sevilla · Hub Sur");
    const [coldChain, setColdChain] = useState(false);

    const [cpType, setCpType] = useState<CheckpointTypeCode>(0 as CheckpointTypeCode);
    const [cpLocation, setCpLocation] = useState("Origen confirmado");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [temp, setTemp] = useState("");
    const [humidity, setHumidity] = useState("");
    const [metadata, setMetadata] = useState("{}");

    const [shipmentAccount, setShipmentAccount] = useState<PublicKey | null>(
        null,
    );

    const [healthProbeBusy, setHealthProbeBusy] = useState(false);
    const [healthProbeResult, setHealthProbeResult] = useState<{
        ok: boolean;
        text: string;
    } | null>(null);

    const [apiActorRows, setApiActorRows] = useState<CatalogOptionRow<ActorRoleCode>[] | null>(
        null,
    );
    const [apiCpRows, setApiCpRows] = useState<CatalogOptionRow<CheckpointTypeCode>[] | null>(
        null,
    );
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [logExpanded, setLogExpanded] = useState(true);
    /** `true` si la PDA Actor para `payer` ya tiene datos en esta red. */
    const [actorAccountExists, setActorAccountExists] = useState<boolean | null>(null);

    const append = useCallback((msg: string) => {
        setLogs((prev) => [
            ...prev.slice(-160),
            `[${new Date().toISOString()}] ${msg}`,
        ]);
    }, []);

    const refreshConfig = useCallback(async () => {
        if (!programId) {
            setProg(null);
            return;
        }
        const res = await fetchProgramConfig(connection, programId);
        setProg(res);
    }, [connection, programId]);

    useEffect(() => {
        let cancel = false;
        (async () => {
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

    const actorRows = apiActorRows ?? FALLBACK_ACTOR_ROWS;
    const cpRows = apiCpRows ?? FALLBACK_CP_ROWS;

    useEffect(() => {
        const rows = apiActorRows;
        if (!rows?.length) {
            return;
        }
        queueMicrotask(() => {
            setRole((prev) =>
                rows.some((r) => r.value === prev) ? prev : rows[0]!.value,
            );
        });
    }, [apiActorRows]);

    useEffect(() => {
        const rows = apiCpRows;
        if (!rows?.length) {
            return;
        }
        queueMicrotask(() => {
            setCpType((prev) =>
                rows.some((r) => r.value === prev) ? prev : rows[0]!.value,
            );
        });
    }, [apiCpRows]);

    useEffect(() => {
        let cancel = false;
        if (!apiBaseTrimmed || !apiBaseWellFormed) {
            queueMicrotask(() => {
                if (cancel) {
                    return;
                }
                setApiActorRows(null);
                setApiCpRows(null);
                setCatalogsLoading(false);
            });
            return () => {
                cancel = true;
            };
        }

        const ac = new AbortController();
        queueMicrotask(() => {
            if (!cancel) {
                setCatalogsLoading(true);
            }
        });

        void (async () => {
            try {
                const onUnknown = (code: string) => {
                    append(`catálogo: código «${code}» sin mapeo on-chain — omitido`);
                };
                const [actorOpts, cpOpts] = await Promise.all([
                    loadActorRoleSelectOptions(apiBaseTrimmed, onUnknown, ac.signal),
                    loadCheckpointSelectOptions(apiBaseTrimmed, onUnknown, ac.signal),
                ]);
                if (cancel) {
                    return;
                }
                if (actorOpts.length > 0 && cpOpts.length > 0) {
                    setApiActorRows(actorOpts);
                    setApiCpRows(cpOpts);
                } else {
                    setApiActorRows(null);
                    setApiCpRows(null);
                    append(
                        "Catálogos API: sin filas tras mapear a enums on-chain — usando lista local.",
                    );
                }
            } catch (e) {
                if (cancel) {
                    return;
                }
                setApiActorRows(null);
                setApiCpRows(null);
                const m = e instanceof Error ? e.message : String(e);
                append(`Catálogos API: ${m} — usando lista local.`);
            } finally {
                if (!cancel) {
                    setCatalogsLoading(false);
                }
            }
        })();

        return () => {
            cancel = true;
            ac.abort();
        };
    }, [apiBaseTrimmed, apiBaseWellFormed, append]);

    const payer = useMemo(
        () => (wallet ? new PublicKey(wallet) : null),
        [wallet],
    );

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

    const actorPdaBase58 = useMemo(() => {
        if (!programId || !payer) {
            return null;
        }
        return actorPda(programId, payer)[0].toBase58();
    }, [programId, payer]);

    const trySync = useCallback(
        async (label: string, fn: () => Promise<{ ok: boolean; status: number }>) => {
            const r = await fn();
            append(`${label} → HTTP ${r.status} ${r.ok ? "OK" : "ERROR"}`);
        },
        [append],
    );

    const runStep = useCallback(
        async (
            key: string,
            action: () => Promise<string>,
            sync: (sig: string) => Promise<void>,
            postVerify?: PostChainVerifyRegisterActor,
        ) => {
            if (!programId) {
                append("Ejecuta este paso después de configurar NEXT_PUBLIC_PROGRAM_ID válido.");
                return;
            }
            if (!payer) {
                append("Conecta Phantom (arriba en esta página) para firmar la transacción.");
                return;
            }
            setBusyKey(key);
            try {
                const sig = await action();
                append(`${key} · tx ${sig}`);
                await sync(sig);
                await refreshConfig();
                if (postVerify?.type === "register_actor") {
                    await logRegisterActorOnChainFollowUp(
                        connection,
                        programId,
                        postVerify,
                        append,
                    );
                }
            } catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                append(`${key} · ERROR: ${m}`);
                if (key === "register_actor" && m.includes("already in use")) {
                    append(
                        `${key} · tip: la PDA Actor de esta wallet parece ya existir en la red (no se puede volver a «crear»). Use otra wallet o continúe con crear envío (paso 3).`,
                    );
                }
            } finally {
                setBusyKey(null);
            }
        },
        [connection, payer, programId, refreshConfig, append],
    );

    const onInitialize = () =>
        runStep(
            "initialize",
            async () => {
                if (!payer || !programId) {
                    throw new Error("Wallet o programa no listo");
                }
                return confirmSerializedTx(
                    connection,
                    payer,
                    createInitializeIx({ programId, authority: payer }),
                );
            },
            async () => {
                /* Sin sync HTTP para initialize en Etapa 1 */
            },
        );

    const onRegisterActor = () =>
        runStep(
            "register_actor",
            async () => {
                if (!payer || !programId) {
                    throw new Error("Wallet o programa no listo");
                }
                const [actorPk] = actorPda(programId, payer);
                const existing = await connection.getAccountInfo(actorPk, "confirmed");
                if (existing?.data?.length) {
                    throw new Error(
                        `Actor ya registrado: la cuenta ${actorPk.toBase58()} existe en esta red. No repita register_actor con la misma wallet.`,
                    );
                }
                return confirmSerializedTx(
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
            },
            async (sig) => {
                if (!cfg.apiBaseUrl?.trim()) {
                    append("sync actor omitido: NEXT_PUBLIC_API_BASE_URL vacío");
                    return;
                }
                await trySync("sync actor", async () => {
                    const r = await postActorsSync(cfg.apiBaseUrl, { tx_hash: sig });
                    return { ok: r.ok, status: r.status };
                });
            },
            prog && payer
                ? {
                      type: "register_actor",
                      actorsCountBefore: prog.decoded.actorsRegistered,
                      authority: payer,
                  }
                : undefined,
        );

    const onCreateShipment = () =>
        runStep(
            "create_shipment",
            async () => {
                if (!payer || !programId) {
                    throw new Error("Wallet o programa no listo");
                }
                const cur = await fetchProgramConfig(connection, programId);
                if (!cur) {
                    throw new Error("ProgramConfig no disponible (¿initialize?)");
                }
                const trimmedRec = recipient.trim();
                const recErr = recipientFieldValidationError(trimmedRec);
                if (recErr) {
                    setRecipientIssue(recErr);
                    queueMicrotask(() => recipientRef.current?.focus());
                    throw new Error(recErr);
                }
                const rec = new PublicKey(trimmedRec);
                const nextId = cur.decoded.shipmentsCreated + BigInt(1);
                const [ship] = shipmentPda(programId, nextId);

                const ix = createCreateShipmentIx({
                    programId,
                    sender: payer,
                    recipient: rec,
                    nextShipmentIndex: nextId,
                    product: product.trim(),
                    origin: origin.trim(),
                    destination: destination.trim(),
                    requiresColdChain: coldChain,
                });

                const sig = await confirmSerializedTx(connection, payer, ix);
                setShipmentAccount(ship);
                return sig;
            },
            async (sig) => {
                if (!cfg.apiBaseUrl?.trim()) {
                    append("sync envío omitido: NEXT_PUBLIC_API_BASE_URL vacío");
                    return;
                }
                await trySync("sync shipment", async () => {
                    const r = await postShipmentsSync(cfg.apiBaseUrl, { tx_hash: sig });
                    return { ok: r.ok, status: r.status };
                });
            },
        );

    const onRecordCheckpoint = () =>
        runStep(
            "record_checkpoint",
            async () => {
                if (!payer || !programId || !shipmentAccount) {
                    throw new Error("Falta wallet, programa o cuenta de envío.");
                }
                const cur = await fetchProgramConfig(connection, programId);
                if (!cur) {
                    throw new Error("ProgramConfig no disponible.");
                }
                const nextCp = cur.decoded.checkpointsRecorded + BigInt(1);
                const latNum: number | null = lat.trim() === "" ? null : Number(lat);
                const lngNum: number | null = lng.trim() === "" ? null : Number(lng);
                const tmpNum: number | null =
                    temp.trim() === "" ? null : Number.parseInt(temp, 10);
                const humNum: number | null =
                    humidity.trim() === ""
                        ? null
                        : Number.parseInt(humidity, 10);
                if (lat.trim() !== "" && Number.isNaN(latNum!)) {
                    throw new Error("Latitud inválida");
                }
                if (lng.trim() !== "" && Number.isNaN(lngNum!)) {
                    throw new Error("Longitud inválida");
                }
                if (temp.trim() !== "" && Number.isNaN(tmpNum!)) {
                    throw new Error("Temperatura inválida");
                }
                if (
                    humidity.trim() !== "" &&
                    (Number.isNaN(humNum!) || humNum! < 0 || humNum! > 255)
                ) {
                    throw new Error("Humedad inválida (0–255)");
                }

                return confirmSerializedTx(
                    connection,
                    payer,
                    createRecordCheckpointIx({
                        programId,
                        authority: payer,
                        shipment: shipmentAccount,
                        nextCheckpointIndex: nextCp,
                        checkpointType: cpType,
                        location: cpLocation.trim(),
                        latitude: latNum,
                        longitude: lngNum,
                        temperature: tmpNum,
                        humidity: humNum,
                        metadata: metadata.trim(),
                    }),
                );
            },
            async (sig) => {
                if (!cfg.apiBaseUrl?.trim()) {
                    append("sync checkpoint omitido: NEXT_PUBLIC_API_BASE_URL vacío");
                    return;
                }
                await trySync("sync checkpoint", async () => {
                    const r = await postCheckpointsSync(cfg.apiBaseUrl, {
                        tx_hash: sig,
                    });
                    return { ok: r.ok, status: r.status };
                });
            },
        );

    const configSummary = prog
        ? `actors=${prog.decoded.actorsRegistered} envíos=${prog.decoded.shipmentsCreated} checkpoints=${prog.decoded.checkpointsRecorded}`
        : programId
          ? "ProgramConfig no leído o programa sin initialize"
          : "Configure NEXT_PUBLIC_PROGRAM_ID válido";

    const onProbeBackendHealth = useCallback(async () => {
        if (!backendHealthUrl) {
            setHealthProbeResult({
                ok: false,
                text: "Configura NEXT_PUBLIC_API_BASE_URL (p. ej. http://localhost:8000/api/v1) para probar el servidor.",
            });
            return;
        }
        setHealthProbeBusy(true);
        setHealthProbeResult(null);
        const ac = new AbortController();
        const t = window.setTimeout(() => ac.abort(), 12_000);
        try {
            const r = await fetchBackendHealth(backendHealthUrl, ac.signal);
            if (r.ok) {
                const db =
                    r.database !== undefined ? ` · base de datos: ${r.database}` : "";
                const text = `GET /health → HTTP ${r.status} OK${db}`;
                setHealthProbeResult({ ok: true, text });
                append(`backend health · HTTP ${r.status} OK${db}`);
            } else {
                const text = `Fallo (${r.status || "sin respuesta"}): ${r.hint}`;
                setHealthProbeResult({ ok: false, text });
                append(`backend health · ERROR: ${text}`);
            }
        } finally {
            window.clearTimeout(t);
            setHealthProbeBusy(false);
        }
    }, [backendHealthUrl, append]);

    const initializeDisabledHint = useMemo(() => {
        if (!programId) {
            return "Configure NEXT_PUBLIC_PROGRAM_ID válido en .env.local.";
        }
        if (!payer) {
            return "Conecte Phantom en la sección Wallet para firmar.";
        }
        if (busyKey !== null && busyKey !== "initialize") {
            return "Espere a que termine la operación en curso.";
        }
        if (prog) {
            return "ProgramConfig ya existe en esta red.";
        }
        return null;
    }, [programId, payer, busyKey, prog]);

    const registerActorDisabledHint = useMemo(() => {
        if (!programId) {
            return "Configure NEXT_PUBLIC_PROGRAM_ID válido.";
        }
        if (!payer) {
            return "Conecte Phantom para firmar.";
        }
        if (!prog) {
            return "Ejecute initialize y espere a cargar ProgramConfig.";
        }
        if (actorAccountExists === true) {
            return `Actor ya registrado para esta wallet${actorPdaBase58 ? ` (${actorPdaBase58})` : ""}. Continúe con el paso 3 o conecte otra wallet.`;
        }
        if (busyKey !== null && busyKey !== "register_actor") {
            return "Espere a que termine la operación en curso.";
        }
        return null;
    }, [programId, payer, prog, busyKey, actorAccountExists, actorPdaBase58]);

    const createShipmentDisabledHint = useMemo(() => {
        if (!programId) {
            return "Configure NEXT_PUBLIC_PROGRAM_ID válido.";
        }
        if (!payer) {
            return "Conecte Phantom para firmar.";
        }
        if (!prog) {
            return "Ejecute initialize y espere a cargar ProgramConfig.";
        }
        if (recipientFieldValidationError(recipient.trim())) {
            return "Revise el destinatario: PublicKey base58 válida.";
        }
        if (busyKey !== null && busyKey !== "create_shipment") {
            return "Espere a que termine la operación en curso.";
        }
        return null;
    }, [programId, payer, prog, busyKey, recipient]);

    const recordCheckpointDisabledHint = useMemo(() => {
        if (!programId) {
            return "Configure NEXT_PUBLIC_PROGRAM_ID válido.";
        }
        if (!payer) {
            return "Conecte Phantom para firmar.";
        }
        if (!prog) {
            return "Ejecute initialize y espere a cargar ProgramConfig.";
        }
        if (!shipmentAccount) {
            return "Cree un envío en el paso 3 para tener la cuenta PDA.";
        }
        if (busyKey !== null && busyKey !== "record_checkpoint") {
            return "Espere a que termine la operación en curso.";
        }
        return null;
    }, [programId, payer, prog, shipmentAccount, busyKey]);

    const initDisabled =
        !payer || !programId || busyKey !== null || !!prog;
    const registerDisabled =
        !payer ||
        !programId ||
        !prog ||
        busyKey !== null ||
        actorAccountExists === true;
    const shipmentDisabled =
        !payer ||
        !programId ||
        !prog ||
        busyKey !== null ||
        recipientFieldValidationError(recipient.trim()) !== null;
    const checkpointDisabled =
        !payer || !programId || !prog || !shipmentAccount || busyKey !== null;

    return (
        <div className="etapa1-demo-root" style={{ display: "grid", gap: "1.5rem" }}>
            <section className="card">
                <div className="card__hd">Wallet</div>
                <div className="card__bd">
                    <PhantomConnect onPublicKeyChange={setWallet} />
                </div>
            </section>

            <section className="card">
                <div className="card__hd">Conectividad · backend Etapa 1</div>
                <div className="card__bd">
                    {!apiBaseTrimmed ? (
                        <p className="badge badge--danger mb-2">
                            Sync HTTP desactivado:{" "}
                            <code className="mono">NEXT_PUBLIC_API_BASE_URL</code> está vacío. Las tx
                            on-chain pueden funcionar pero no se replicarán a PostgreSQL (POST
                            …/sync).
                        </p>
                    ) : null}

                    <p className="text-sm text-muted mb-1">
                        <code className="mono">NEXT_PUBLIC_API_BASE_URL</code>
                    </p>
                    <p className="mono text-sm mb-2 break-all">
                        {apiBaseTrimmed || "(no configurado)"}
                    </p>

                    {apiBaseTrimmed !== "" && !apiBaseWellFormed ? (
                        <p className="badge badge--warn mb-2">
                            La URL conviene terminar en <code className="mono">/api/v1</code> (sin
                            barra final): el cliente pega{" "}
                            <code className="mono">actors/sync</code> detrás de este valor.
                        </p>
                    ) : null}

                    <p className="text-sm text-muted mb-1">Ping diagnóstico (raíz del backend)</p>
                    <p className="mono text-sm mb-3 break-all">
                        {backendHealthUrl
                            ? `GET ${backendHealthUrl}`
                            : "— (defina NEXT_PUBLIC_API_BASE_URL)"}
                    </p>

                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={!backendHealthUrl || healthProbeBusy}
                        onClick={() => void onProbeBackendHealth()}
                    >
                        {healthProbeBusy ? "Probando…" : "Probar backend"}
                    </button>

                    {healthProbeResult ? (
                        <p
                            className={`text-sm mt-2 mb-0 badge ${healthProbeResult.ok ? "badge--success" : "badge--danger"}`}
                        >
                            {healthProbeResult.text}
                        </p>
                    ) : null}
                </div>
            </section>

            {!programId ? (
                <p className="badge badge--danger">
                    Falta o es inválido{" "}
                    <code className="mono">NEXT_PUBLIC_PROGRAM_ID</code> en{" "}
                    <code className="mono">.env.local</code>.
                </p>
            ) : null}

            <section className="card">
                <div className="card__hd">Estado on-chain</div>
                <div className="card__bd">
                    <p className="text-sm text-muted mb-0">{configSummary}</p>
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm mt-2"
                        onClick={() => void refreshConfig()}
                    >
                        Refrescar ProgramConfig
                    </button>
                    {shipmentAccount ? (
                        <p className="text-sm mt-2 mb-0">
                            Última cuenta de envío (PDA):{" "}
                            <span className="mono">{shipmentAccount.toBase58()}</span>
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card etapa1-demo-intro" aria-labelledby="etapa1-intro-h">
                <div className="card__hd" id="etapa1-intro-h">
                    Flujo de la demo (Etapa 1)
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted mb-2">
                        Orden recomendado: transacciones on-chain y, cuando aplique, POST de sync al
                        backend.
                    </p>
                    <ol className="etapa1-demo-flow-ol text-sm text-muted">
                        <li>Inicializar el programa (una vez por despliegue en la red).</li>
                        <li>Registrar actor y sincronizar con PostgreSQL.</li>
                        <li>Crear envío y sincronizar.</li>
                        <li>Registrar checkpoint y sincronizar.</li>
                    </ol>
                </div>
            </section>

            <div
                className="etapa1-demo-flow"
                role="region"
                aria-label="Pasos on-chain y formularios Etapa 1"
            >
            <section className="card">
                <div className="card__hd" id="etapa1-step-1-init">
                    1 · Initialize (una vez)
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead" id="etapa1-step-1-desc">
                        Inicializa <code className="mono">ProgramConfig</code>. Omite si ya existe.
                    </p>
                    <button
                        type="button"
                        className={`btn btn--primary${busyKey === "initialize" ? " is-busy" : ""}`}
                        disabled={initDisabled}
                        onClick={() => void onInitialize()}
                        aria-describedby="etapa1-step-1-desc"
                        aria-busy={busyKey === "initialize"}
                    >
                        {busyKey === "initialize" ? "Enviando…" : "Ejecutar initialize"}
                    </button>
                    {initDisabled && initializeDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {initializeDisabledHint}
                        </p>
                    ) : null}
                    {prog ? (
                        <p className="text-sm text-muted mt-2 mb-0">
                            ProgramConfig ya existe en esta red — no vuelvas a ejecutar initialize.
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card">
                <div className="card__hd" id="etapa1-step-2-actor">
                    2 · Registrar actor
                </div>
                <div className="card__bd">
                    {catalogsLoading ? (
                        <p className="text-sm text-muted mb-2">Cargando catálogos desde API…</p>
                    ) : null}
                    {!catalogsLoading && apiBaseWellFormed && apiActorRows ? (
                        <p className="text-sm text-muted mb-2">
                            Rol: datos desde PostgreSQL vía API.
                        </p>
                    ) : null}
                    {!catalogsLoading && (!apiBaseWellFormed || !apiActorRows) ? (
                        <p className="text-sm text-muted mb-2">
                            Rol: lista local (configure URL API válida o revise backend/DB).
                        </p>
                    ) : null}
                    {actorAccountExists === true && actorPdaBase58 ? (
                        <p className="badge badge--info mb-2">
                            Actor ya creado on-chain para esta wallet — PDA{" "}
                            <code className="mono">{actorPdaBase58}</code>
                        </p>
                    ) : null}
                    <p className="text-sm text-muted etapa1-step-lead mb-2" id="etapa1-step-2-desc">
                        Asocia una wallet autorizada con rol y metadatos; luego se indexa en el
                        backend con el hash de la transacción. Tras firmar, el registro inferior
                        mostrará si subió <code className="mono">actorsRegistered</code> y si existe
                        la cuenta PDA Actor on-chain.
                    </p>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="role">Rol</label>
                            <select
                                id="role"
                                className="select"
                                value={role}
                                onChange={(e) =>
                                    setRole(Number(e.target.value) as ActorRoleCode)
                                }
                                aria-describedby="etapa1-step-2-desc"
                            >
                                {actorRows.map((o) => (
                                    <option key={o.code} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="aname">Nombre</label>
                            <input
                                id="aname"
                                className="input"
                                value={actorName}
                                onChange={(e) => setActorName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="aloc">Ubicación</label>
                        <input
                            id="aloc"
                            className="input"
                            value={actorLocation}
                            onChange={(e) => setActorLocation(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className={`btn btn--primary${busyKey === "register_actor" ? " is-busy" : ""}`}
                        disabled={registerDisabled}
                        onClick={() => void onRegisterActor()}
                        aria-describedby="etapa1-step-2-desc"
                        aria-busy={busyKey === "register_actor"}
                    >
                        {busyKey === "register_actor" ? "Enviando…" : "register_actor + sync"}
                    </button>
                    {registerDisabled && registerActorDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {registerActorDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card">
                <div className="card__hd" id="etapa1-step-3-ship">
                    3 · Crear envío
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead mb-2" id="etapa1-step-3-desc">
                        El remitente es tu wallet conectada; indica la clave pública del destinatario
                        en base58.
                    </p>
                    <div className="form-group">
                        <label htmlFor="rec">Destinatario (PublicKey base58)</label>
                        <p className="text-sm text-muted mb-1" id="rec-help">
                            Clave pública en base58 (32 bytes on-chain; longitud típica 43–44
                            caracteres). Puede ser otra cuenta tuya en localnet.
                        </p>
                        <input
                            ref={recipientRef}
                            id="rec"
                            className={`input mono${recipientIssue ? " is-invalid" : ""}`}
                            value={recipient}
                            onChange={(e) => {
                                setRecipient(e.target.value);
                                setRecipientIssue(null);
                            }}
                            onBlur={() => {
                                const t = recipient.trim();
                                setRecipientIssue(t ? recipientFieldValidationError(t) : null);
                            }}
                            placeholder="Ej. otra wallet Phantom en la misma red"
                            aria-invalid={recipientIssue ? "true" : "false"}
                            aria-describedby="rec-help rec-err"
                        />
                        <p
                            id="rec-err"
                            className={recipientIssue ? "text-sm mt-1 mb-0" : "sr-only"}
                            role={recipientIssue ? "alert" : undefined}
                        >
                            {recipientIssue ?? ""}
                        </p>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="prod">Producto</label>
                            <input
                                id="prod"
                                className="input"
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cold">Cadena de frío</label>
                            <select
                                id="cold"
                                className="select"
                                value={coldChain ? "1" : "0"}
                                onChange={(e) => setColdChain(e.target.value === "1")}
                            >
                                <option value="0">No</option>
                                <option value="1">Sí</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="orig">Origen</label>
                        <input
                            id="orig"
                            className="input"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dest">Destino</label>
                        <input
                            id="dest"
                            className="input"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className={`btn btn--primary${busyKey === "create_shipment" ? " is-busy" : ""}`}
                        disabled={shipmentDisabled}
                        onClick={() => void onCreateShipment()}
                        aria-describedby="etapa1-step-3-desc"
                        aria-busy={busyKey === "create_shipment"}
                    >
                        {busyKey === "create_shipment" ? "Enviando…" : "create_shipment + sync"}
                    </button>
                    {shipmentDisabled && createShipmentDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {createShipmentDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card">
                <div className="card__hd" id="etapa1-step-4-cp">
                    4 · Registrar checkpoint
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead" id="etapa1-step-4-desc">
                        Tras crear el envío, el estado inicial es Created: usa{" "}
                        <strong>Pickup</strong> para avanzar a InTransit.
                    </p>
                    {!catalogsLoading && apiBaseWellFormed && apiCpRows ? (
                        <p className="text-sm text-muted mb-2">
                            Tipo de checkpoint: datos desde PostgreSQL vía API.
                        </p>
                    ) : null}
                    {!catalogsLoading && (!apiBaseWellFormed || !apiCpRows) ? (
                        <p className="text-sm text-muted mb-2">
                            Tipo de checkpoint: lista local (configure URL API válida o revise
                            backend/DB).
                        </p>
                    ) : null}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="cpt">Tipo</label>
                            <select
                                id="cpt"
                                className="select"
                                value={cpType}
                                onChange={(e) =>
                                    setCpType(Number(e.target.value) as CheckpointTypeCode)
                                }
                                aria-describedby="etapa1-step-4-desc"
                            >
                                {cpRows.map((o) => (
                                    <option key={o.code} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="cpl">Lugar</label>
                            <input
                                id="cpl"
                                className="input"
                                value={cpLocation}
                                onChange={(e) => setCpLocation(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="lat">Lat (opc.)</label>
                            <input
                                id="lat"
                                className="input mono"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lng">Lng (opc.)</label>
                            <input
                                id="lng"
                                className="input mono"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="tmp">Temperatura °C (opc., i16)</label>
                            <input
                                id="tmp"
                                className="input mono"
                                value={temp}
                                onChange={(e) => setTemp(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hum">Humedad (opc., u8)</label>
                            <input
                                id="hum"
                                className="input mono"
                                value={humidity}
                                onChange={(e) => setHumidity(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="meta">Metadata</label>
                        <textarea
                            id="meta"
                            className="textarea"
                            value={metadata}
                            onChange={(e) => setMetadata(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className={`btn btn--primary${busyKey === "record_checkpoint" ? " is-busy" : ""}`}
                        disabled={checkpointDisabled}
                        onClick={() => void onRecordCheckpoint()}
                        aria-describedby="etapa1-step-4-desc"
                        aria-busy={busyKey === "record_checkpoint"}
                    >
                        {busyKey === "record_checkpoint"
                            ? "Enviando…"
                            : "record_checkpoint + sync"}
                    </button>
                    {checkpointDisabled && recordCheckpointDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {recordCheckpointDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>
            </div>

            <section className="card etapa1-log-card" aria-labelledby="etapa1-log-h">
                <div className="card__hd" id="etapa1-log-h">
                    <span>Registro de actividad</span>
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setLogExpanded((v) => !v)}
                        aria-expanded={logExpanded}
                        aria-controls="etapa1-log-body"
                    >
                        {logExpanded ? "Ocultar" : "Mostrar"}
                    </button>
                </div>
                <div className="card__bd">
                    <div
                        id="etapa1-log-body"
                        className={`etapa1-log__body${logExpanded ? "" : " etapa1-log__body--collapsed"}`}
                    >
                        <pre className="mono text-sm etapa1-log__pre">
                            {logs.length === 0 ? (
                                "Aún sin eventos."
                            ) : (
                                <>
                                    {logs.slice(0, -1).join("\n")}
                                    {logs.length > 1 ? "\n" : ""}
                                    <span className="etapa1-log__line--latest">
                                        {logs[logs.length - 1]}
                                    </span>
                                </>
                            )}
                        </pre>
                    </div>
                </div>
            </section>
        </div>
    );
}
