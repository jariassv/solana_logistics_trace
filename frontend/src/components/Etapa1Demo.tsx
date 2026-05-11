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
import {
    adminHints,
    catalogSourceLabel,
    healthProbeUserMessage,
    programStateSummary,
    recipientFieldValidationError,
    syncSuccessCopy,
    userFacingChainError,
    userMessageForSyncFailure,
    type ChainStepKey,
} from "@/lib/panel/etapa1UserMessages";

import { PhantomConnect } from "./PhantomConnect";

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
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<{
        variant: "success" | "error" | "info";
        text: string;
    } | null>(null);

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
    /** `true` si la PDA Actor para `payer` ya tiene datos en esta red. */
    const [actorAccountExists, setActorAccountExists] = useState<boolean | null>(null);

    useEffect(() => {
        if (!notice) {
            return;
        }
        const id = window.setTimeout(() => {
            setNotice(null);
        }, 8000);
        return () => {
            window.clearTimeout(id);
        };
    }, [notice]);

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

        queueMicrotask(() => {
            if (!cancel) {
                setCatalogsLoading(true);
            }
        });

        void (async () => {
            try {
                const [actorOpts, cpOpts] = await Promise.all([
                    loadActorRoleSelectOptions(apiBaseTrimmed),
                    loadCheckpointSelectOptions(apiBaseTrimmed),
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
                    setNotice({
                        variant: "info",
                        text: "Se usan listas de referencia locales hasta recibir datos del sistema central.",
                    });
                }
            } catch {
                if (cancel) {
                    return;
                }
                setApiActorRows(null);
                setApiCpRows(null);
                setNotice({
                    variant: "info",
                    text: "No se pudieron cargar las listas de referencia; se usan valores locales.",
                });
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

    const trySync = useCallback(
        async (
            entity: "actor" | "shipment" | "checkpoint",
            fn: () => Promise<{ ok: boolean; status: number; json: unknown }>,
        ) => {
            const r = await fn();
            if (r.ok) {
                setNotice({ variant: "success", text: syncSuccessCopy[entity] });
            } else {
                setNotice({
                    variant: "error",
                    text: userMessageForSyncFailure(
                        entity === "actor"
                            ? "el actor"
                            : entity === "shipment"
                              ? "el envío"
                              : "el evento",
                        r.status,
                        r.json,
                    ),
                });
            }
        },
        [setNotice],
    );

    const runStep = useCallback(
        async (
            key: ChainStepKey,
            action: () => Promise<string>,
            sync: (sig: string) => Promise<void>,
        ) => {
            if (!programId) {
                setNotice({ variant: "info", text: adminHints.programNotConfigured });
                return;
            }
            if (!payer) {
                setNotice({ variant: "info", text: adminHints.walletConnect });
                return;
            }
            setBusyKey(key);
            try {
                const sig = await action();
                await sync(sig);
                await refreshConfig();
                if (key === "initialize") {
                    setNotice({
                        variant: "success",
                        text: "Programa activado correctamente en esta red.",
                    });
                }
            } catch (e) {
                const m = e instanceof Error ? e.message : String(e);
                setNotice({ variant: "error", text: userFacingChainError(key, m) });
            } finally {
                setBusyKey(null);
            }
        },
        [payer, programId, refreshConfig, setNotice],
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
                    throw new Error("Actor ya registrado para esta cartera en esta red.");
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
                    setNotice({
                        variant: "info",
                        text: "Operación completada en cadena. La replicación al sistema central no está activa.",
                    });
                    return;
                }
                await trySync("actor", async () => {
                    const r = await postActorsSync(cfg.apiBaseUrl, { tx_hash: sig });
                    return { ok: r.ok, status: r.status, json: r.json };
                });
            },
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
                    setNotice({
                        variant: "info",
                        text: "Operación completada en cadena. La replicación al sistema central no está activa.",
                    });
                    return;
                }
                await trySync("shipment", async () => {
                    const r = await postShipmentsSync(cfg.apiBaseUrl, { tx_hash: sig });
                    return { ok: r.ok, status: r.status, json: r.json };
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
                    setNotice({
                        variant: "info",
                        text: "Operación completada en cadena. La replicación al sistema central no está activa.",
                    });
                    return;
                }
                await trySync("checkpoint", async () => {
                    const r = await postCheckpointsSync(cfg.apiBaseUrl, {
                        tx_hash: sig,
                    });
                    return { ok: r.ok, status: r.status, json: r.json };
                });
            },
        );

    const configSummary = programStateSummary({
        hasProgramId: Boolean(programId),
        actors: prog?.decoded.actorsRegistered ?? null,
        shipments: prog?.decoded.shipmentsCreated ?? null,
        checkpoints: prog?.decoded.checkpointsRecorded ?? null,
        configReadable: Boolean(prog),
    });

    const onProbeBackendHealth = useCallback(async () => {
        if (!backendHealthUrl) {
            setHealthProbeResult({
                ok: false,
                text: "Indique la URL del servicio de datos (incluida la ruta del API) en la configuración del cliente.",
            });
            return;
        }
        setHealthProbeBusy(true);
        setHealthProbeResult(null);
        const ac = new AbortController();
        const t = window.setTimeout(() => ac.abort(), 12_000);
        try {
            const r = await fetchBackendHealth(backendHealthUrl, ac.signal);
            const u = healthProbeUserMessage(r);
            setHealthProbeResult(u);
        } finally {
            window.clearTimeout(t);
            setHealthProbeBusy(false);
        }
    }, [backendHealthUrl]);

    const initializeDisabledHint = useMemo(() => {
        if (!programId) {
            return adminHints.programNotConfigured;
        }
        if (!payer) {
            return adminHints.walletConnect;
        }
        if (busyKey !== null && busyKey !== "initialize") {
            return adminHints.waitBusy;
        }
        if (prog) {
            return adminHints.programAlreadyActive;
        }
        return null;
    }, [programId, payer, busyKey, prog]);

    const registerActorDisabledHint = useMemo(() => {
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
            return "Esta cartera ya tiene un actor registrado. Continúe con el registro de envíos o utilice otra cartera.";
        }
        if (busyKey !== null && busyKey !== "register_actor") {
            return adminHints.waitBusy;
        }
        return null;
    }, [programId, payer, prog, busyKey, actorAccountExists]);

    const createShipmentDisabledHint = useMemo(() => {
        if (!programId) {
            return adminHints.programNotConfigured;
        }
        if (!payer) {
            return adminHints.walletConnect;
        }
        if (!prog) {
            return adminHints.runInitializeFirst;
        }
        if (recipientFieldValidationError(recipient.trim())) {
            return adminHints.recipientInvalid;
        }
        if (busyKey !== null && busyKey !== "create_shipment") {
            return adminHints.waitBusy;
        }
        return null;
    }, [programId, payer, prog, busyKey, recipient]);

    const recordCheckpointDisabledHint = useMemo(() => {
        if (!programId) {
            return adminHints.programNotConfigured;
        }
        if (!payer) {
            return adminHints.walletConnect;
        }
        if (!prog) {
            return adminHints.runInitializeFirst;
        }
        if (!shipmentAccount) {
            return adminHints.shipmentPdaMissing;
        }
        if (busyKey !== null && busyKey !== "record_checkpoint") {
            return adminHints.waitBusy;
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

    const actorCatalogFootnote = catalogSourceLabel({
        loading: catalogsLoading,
        fromApi: Boolean(apiBaseWellFormed && apiActorRows),
    });
    const cpCatalogFootnote = catalogSourceLabel({
        loading: catalogsLoading,
        fromApi: Boolean(apiBaseWellFormed && apiCpRows),
    });

    return (
        <div className="admin-etapa1">
            {notice ? (
                <div
                    role="status"
                    aria-live="polite"
                    className={`admin-etapa1__toast admin-etapa1__toast--${notice.variant}`}
                >
                    {notice.text}
                </div>
            ) : null}

            <div className="admin-etapa1__columns">
                <aside className="admin-etapa1__rail" aria-label="Resumen y conexiones">
                    <section className="card admin-etapa1__card">
                        <div className="card__hd">Cartera firmante</div>
                        <div className="card__bd">
                            <PhantomConnect onPublicKeyChange={setWallet} />
                        </div>
                    </section>

                    <section className="card admin-etapa1__card">
                        <div className="card__hd">Servicio de datos</div>
                        <div className="card__bd">
                            {!apiBaseTrimmed ? (
                                <p className="admin-etapa1__inline-alert admin-etapa1__inline-alert--danger">
                                    {adminHints.apiReplicationOff}
                                </p>
                            ) : (
                                <>
                                    <p className="admin-etapa1__muted-label">URL del API</p>
                                    <p className="admin-etapa1__mono-value">{apiBaseTrimmed}</p>
                                    {apiBaseTrimmed !== "" && !apiBaseWellFormed ? (
                                        <p className="admin-etapa1__inline-alert admin-etapa1__inline-alert--warn">
                                            {adminHints.apiUrlMalformed}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        className="btn btn--secondary btn--sm mt-2"
                                        disabled={!backendHealthUrl || healthProbeBusy}
                                        onClick={() => void onProbeBackendHealth()}
                                    >
                                        {healthProbeBusy
                                            ? "Comprobando…"
                                            : "Comprobar disponibilidad"}
                                    </button>
                                    {healthProbeResult ? (
                                        <p
                                            className={`admin-etapa1__health-result admin-etapa1__health-result--${healthProbeResult.ok ? "ok" : "err"}`}
                                        >
                                            {healthProbeResult.text}
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </section>

                    <section className="card admin-etapa1__card">
                        <div className="card__hd">Estado en red</div>
                        <div className="card__bd">
                            <p className="admin-etapa1__state-line">{configSummary}</p>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm mt-2"
                                onClick={() => void refreshConfig()}
                            >
                                Actualizar lectura
                            </button>
                            {shipmentAccount ? (
                                <p className="text-sm text-muted mt-3 mb-0">
                                    Hay un envío registrado en esta sesión; puede añadir eventos
                                    logísticos.
                                </p>
                            ) : null}
                        </div>
                    </section>
                </aside>

                <div
                    className="admin-etapa1__workspace"
                    role="region"
                    aria-label="Operaciones de trazabilidad"
                >
                    {!programId ? (
                        <div className="admin-etapa1__banner admin-etapa1__banner--danger">
                            Falta configurar el programa de trazabilidad en el despliegue del
                            cliente.
                        </div>
                    ) : null}

                    <section className="card admin-etapa1__card" aria-labelledby="etapa1-intro-h">
                        <div className="card__hd" id="etapa1-intro-h">
                            Flujo operativo
                        </div>
                        <div className="card__bd">
                            <ol className="admin-etapa1__flow-list">
                                <li>Activación única del programa en la red.</li>
                                <li>Alta del actor y replicación al sistema central.</li>
                                <li>Registro del envío.</li>
                                <li>Registro del evento logístico asociado al envío.</li>
                            </ol>
                        </div>
                    </section>

                    <div className="etapa1-demo-flow">
            <section className="card admin-etapa1__card">
                <div className="card__hd" id="etapa1-step-1-init">
                    1 · Activación del programa
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead" id="etapa1-step-1-desc">
                        Ejecución única por despliegue. Si el programa ya está activo, omita este
                        paso.
                    </p>
                    <button
                        type="button"
                        className={`btn btn--primary${busyKey === "initialize" ? " is-busy" : ""}`}
                        disabled={initDisabled}
                        onClick={() => void onInitialize()}
                        aria-describedby="etapa1-step-1-desc"
                        aria-busy={busyKey === "initialize"}
                    >
                        {busyKey === "initialize" ? "Procesando…" : "Activar programa"}
                    </button>
                    {initDisabled && initializeDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {initializeDisabledHint}
                        </p>
                    ) : null}
                    {prog ? (
                        <p className="text-sm text-muted mt-2 mb-0">
                            El programa ya está activo en esta red.
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card admin-etapa1__card">
                <div className="card__hd" id="etapa1-step-2-actor">
                    2 · Alta de actor
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted mb-2">{actorCatalogFootnote}</p>
                    {actorAccountExists === true ? (
                        <p className="admin-etapa1__pill admin-etapa1__pill--info mb-2">
                            Identidad ya registrada para esta cartera.
                        </p>
                    ) : null}
                    <p className="text-sm text-muted etapa1-step-lead mb-2" id="etapa1-step-2-desc">
                        Defina el rol y los datos del participante. Tras confirmar, los datos se
                        replicarán al sistema central si el servicio está configurado.
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
                        {busyKey === "register_actor" ? "Procesando…" : "Registrar actor"}
                    </button>
                    {registerDisabled && registerActorDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {registerActorDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card admin-etapa1__card">
                <div className="card__hd" id="etapa1-step-3-ship">
                    3 · Registro de envío
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead mb-2" id="etapa1-step-3-desc">
                        El remitente es la cartera conectada. Indique la clave pública del
                        destinatario.
                    </p>
                    <div className="form-group">
                        <label htmlFor="rec">Destinatario</label>
                        <p className="text-sm text-muted mb-1" id="rec-help">
                            Clave pública del receptor (formato estándar de la red).
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
                        {busyKey === "create_shipment" ? "Procesando…" : "Registrar envío"}
                    </button>
                    {shipmentDisabled && createShipmentDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {createShipmentDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="card admin-etapa1__card">
                <div className="card__hd" id="etapa1-step-4-cp">
                    4 · Evento logístico
                </div>
                <div className="card__bd">
                    <p className="text-sm text-muted etapa1-step-lead" id="etapa1-step-4-desc">
                        Tras registrar el envío, comience normalmente con{" "}
                        <strong>Recogida (Pickup)</strong> para reflejar el inicio del tránsito.
                    </p>
                    <p className="text-sm text-muted mb-2">{cpCatalogFootnote}</p>
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
                            <label htmlFor="tmp">Temperatura °C (opcional)</label>
                            <input
                                id="tmp"
                                className="input mono"
                                value={temp}
                                onChange={(e) => setTemp(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hum">Humedad (opcional)</label>
                            <input
                                id="hum"
                                className="input mono"
                                value={humidity}
                                onChange={(e) => setHumidity(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="meta">Notas adicionales (JSON)</label>
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
                        {busyKey === "record_checkpoint" ? "Procesando…" : "Registrar evento"}
                    </button>
                    {checkpointDisabled && recordCheckpointDisabledHint ? (
                        <p className="form-action-hint text-sm text-muted mt-2 mb-0">
                            {recordCheckpointDisabledHint}
                        </p>
                    ) : null}
                </div>
            </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
