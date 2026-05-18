"use client";

import { useCallback, useEffect, useState } from "react";
import type { Connection, PublicKey } from "@solana/web3.js";
import { PublicKey as PK } from "@solana/web3.js";

import { GeoPointField, type LocationInputMode } from "@/components/admin/GeoPointField";
import { getRecipientActors, type RecipientOption } from "@/lib/api/actors";
import { apiBaseHasV1Prefix, normalizeApiBaseUrl } from "@/lib/api/backendConnectivity";
import { postShipmentsSync } from "@/lib/api/sync";
import {
    geoPointCoordsValidationError,
    geoPointValidationError,
    isGeoPointString,
} from "@/lib/geo/geoPoint";
import {
    adminHints,
    recipientFieldValidationError,
    syncSuccessCopy,
    userFacingChainError,
    userMessageForSyncFailure,
} from "@/lib/panel/etapa1UserMessages";
import { confirmSerializedTx } from "@/lib/solana/confirmSerializedTx";
import { createCreateShipmentIx } from "@/lib/solana/instructions";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import { actorPda } from "@/lib/solana/pdas";

export type CreateShipmentFormProps = {
    connection: Connection;
    programId: PublicKey;
    payer: PublicKey;
    apiBaseUrl: string;
    /** Rol en backend (debe ser Sender). */
    role: string | null;
    onSuccess: () => void;
};

export function CreateShipmentForm({
    connection,
    programId,
    payer,
    apiBaseUrl,
    role,
    onSuccess,
}: CreateShipmentFormProps) {
    const [recipient, setRecipient] = useState("");
    const [recipientIssue, setRecipientIssue] = useState<string | null>(null);
    const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([]);
    const [recipientsLoading, setRecipientsLoading] = useState(false);
    const [recipientsLoadError, setRecipientsLoadError] = useState<string | null>(null);
    const [product, setProduct] = useState("");
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [coldChain, setColdChain] = useState(false);
    const [busy, setBusy] = useState(false);
    const [senderActorReady, setSenderActorReady] = useState<boolean | null>(null);
    const [banner, setBanner] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(
        null,
    );

    const apiBaseTrimmed = normalizeApiBaseUrl(apiBaseUrl ?? "");
    const apiBaseWellFormed =
        apiBaseTrimmed !== "" && apiBaseHasV1Prefix(apiBaseTrimmed);

    useEffect(() => {
        let cancel = false;
        if (!apiBaseWellFormed) {
            queueMicrotask(() => {
                if (!cancel) {
                    setRecipientOptions([]);
                    setRecipientsLoading(false);
                    setRecipientsLoadError(null);
                }
            });
            return () => {
                cancel = true;
            };
        }
        queueMicrotask(() => {
            if (!cancel) {
                setRecipientsLoading(true);
                setRecipientsLoadError(null);
            }
        });
        void getRecipientActors(apiBaseTrimmed).then((res) => {
            if (cancel) {
                return;
            }
            if (res.ok) {
                setRecipientOptions(res.data);
                setRecipientsLoadError(null);
                if (res.data.length === 1) {
                    setRecipient(res.data[0]!.wallet);
                }
            } else {
                setRecipientOptions([]);
                setRecipientsLoadError("No se pudo cargar la lista de destinatarios.");
            }
            setRecipientsLoading(false);
        });
        return () => {
            cancel = true;
        };
    }, [apiBaseTrimmed, apiBaseWellFormed]);

    useEffect(() => {
        let cancel = false;
        const [pda] = actorPda(programId, payer);
        void connection.getAccountInfo(pda, "confirmed").then((acc) => {
            if (!cancel) {
                setSenderActorReady(Boolean(acc?.data?.length));
            }
        });
        return () => {
            cancel = true;
        };
    }, [connection, programId, payer]);

    const [originMode, setOriginMode] = useState<LocationInputMode>(() =>
        isGeoPointString(origin) ? "coordinates" : "text",
    );
    const [destMode, setDestMode] = useState<LocationInputMode>(() =>
        isGeoPointString(destination) ? "coordinates" : "text",
    );

    const originErr =
        geoPointCoordsValidationError(originMode, origin, "origen") ??
        (originMode === "text" ? geoPointValidationError(origin, "el origen") : null);
    const destErr =
        geoPointCoordsValidationError(destMode, destination, "destino") ??
        (destMode === "text" ? geoPointValidationError(destination, "el destino") : null);

    const onSubmit = useCallback(async () => {
        const trimmedRec = recipient.trim();
        const recErr = recipientFieldValidationError(trimmedRec);
        if (recErr) {
            setRecipientIssue(recErr);
            return;
        }
        if (originErr || destErr) {
            setBanner({
                kind: "err",
                text: originErr ?? destErr ?? "Revise origen y destino.",
            });
            return;
        }
        if (senderActorReady === false) {
            setBanner({
                kind: "err",
                text: "Debe registrar su actor en esta red (rol remitente) antes de crear envíos.",
            });
            return;
        }
        if (role && role !== "Sender") {
            setBanner({
                kind: "err",
                text: `Su rol (${role}) no puede crear envíos. Use una wallet con rol Sender.`,
            });
            return;
        }

        setBusy(true);
        setBanner(null);
        try {
            const cur = await fetchProgramConfig(connection, programId);
            if (!cur) {
                throw new Error("ProgramConfig no disponible (¿initialize?)");
            }
            const rec = new PK(trimmedRec);
            const nextId = cur.decoded.shipmentsCreated + BigInt(1);
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

            let syncOk = true;
            if (apiBaseUrl.trim()) {
                const r = await postShipmentsSync(apiBaseUrl, { tx_hash: sig });
                if (r.ok) {
                    setBanner({ kind: "ok", text: syncSuccessCopy.shipment });
                } else {
                    syncOk = false;
                    setBanner({
                        kind: "err",
                        text: `${syncSuccessCopy.shipment.replace(" y replicado", "")} en cadena, pero ${userMessageForSyncFailure("el envío", r.status, r.json).toLowerCase()}`,
                    });
                }
            } else {
                setBanner({
                    kind: "info",
                    text: "Envío registrado en cadena. Configure la API para sincronizar con el backend.",
                });
            }

            if (syncOk) {
                onSuccess();
            }
        } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            setBanner({ kind: "err", text: userFacingChainError("create_shipment", m) });
        } finally {
            setBusy(false);
        }
    }, [
        connection,
        programId,
        payer,
        recipient,
        product,
        origin,
        destination,
        coldChain,
        apiBaseUrl,
        onSuccess,
        originErr,
        destErr,
        senderActorReady,
        role,
    ]);

    const disabled =
        busy ||
        !product.trim() ||
        !recipient.trim() ||
        Boolean(originErr) ||
        Boolean(destErr) ||
        recipientFieldValidationError(recipient.trim()) !== null ||
        senderActorReady === false ||
        (recipientOptions.length === 0 && !recipientsLoading && apiBaseWellFormed);

    return (
        <form
            className="admin-form"
            onSubmit={(e) => {
                e.preventDefault();
                void onSubmit();
            }}
        >
            {senderActorReady === false ? (
                <p className="admin-form__err text-sm mb-2" role="alert">
                    No hay cuenta de actor para su wallet en esta red. Complete el paso «Alta de
                    actor» con rol <strong>Sender</strong>.
                </p>
            ) : null}
            {role && role !== "Sender" ? (
                <p className="admin-form__err text-sm mb-2" role="alert">
                    Su rol actual ({role}) no puede crear envíos.
                </p>
            ) : null}

            <div className="form-group">
                <label htmlFor="admin-ship-rec">Destinatario</label>
                <select
                    id="admin-ship-rec"
                    className={`select${recipientIssue ? " is-invalid" : ""}`}
                    value={recipient}
                    disabled={busy || recipientsLoading || recipientOptions.length === 0}
                    onChange={(e) => {
                        setRecipient(e.target.value);
                        setRecipientIssue(null);
                    }}
                >
                    <option value="">
                        {recipientsLoading
                            ? "Cargando destinatarios…"
                            : recipientOptions.length === 0
                              ? "Sin destinatarios registrados"
                              : "Seleccione un destinatario"}
                    </option>
                    {recipientOptions.map((o) => (
                        <option key={o.wallet} value={o.wallet}>
                            {o.displayLabel}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted mb-0 mt-1">
                    Solo actores con rol Recipient en el sistema. La wallet se muestra abreviada;
                    al registrar el envío se usa la clave completa on-chain.
                </p>
                {recipientsLoadError ? (
                    <p className="text-sm admin-form__err mb-0 mt-1" role="alert">
                        {recipientsLoadError}
                    </p>
                ) : null}
                {!recipientsLoading &&
                recipientOptions.length === 0 &&
                !recipientsLoadError &&
                apiBaseWellFormed ? (
                    <p className="text-sm text-muted mb-0 mt-1" role="status">
                        Registre destinatarios en{" "}
                        <a className="link" href="/registro">
                            /registro
                        </a>{" "}
                        con rol Recipient y sincronice.
                    </p>
                ) : null}
                {recipientIssue ? (
                    <p className="text-sm admin-form__err mb-0 mt-1" role="alert">
                        {recipientIssue}
                    </p>
                ) : null}
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="admin-ship-prod">Producto</label>
                    <input
                        id="admin-ship-prod"
                        className="input"
                        value={product}
                        disabled={busy}
                        onChange={(e) => setProduct(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="admin-ship-cold">Cadena de frío</label>
                    <select
                        id="admin-ship-cold"
                        className="select"
                        value={coldChain ? "1" : "0"}
                        disabled={busy}
                        onChange={(e) => setColdChain(e.target.value === "1")}
                    >
                        <option value="0">No</option>
                        <option value="1">Sí</option>
                    </select>
                </div>
            </div>

            <GeoPointField
                id="admin-ship-orig"
                label="Origen"
                value={origin}
                mode={originMode}
                onModeChange={setOriginMode}
                disabled={busy}
                onChange={setOrigin}
            />
            <GeoPointField
                id="admin-ship-dest"
                label="Destino"
                value={destination}
                mode={destMode}
                onModeChange={setDestMode}
                disabled={busy}
                onChange={setDestination}
            />

            {!programId ? (
                <p className="text-sm text-muted mb-2">{adminHints.programNotConfigured}</p>
            ) : null}

            <button
                type="submit"
                className={`btn btn--primary btn--block${busy ? " is-busy" : ""}`}
                disabled={disabled}
                aria-busy={busy}
            >
                {busy ? "Firmando…" : "Registrar envío"}
            </button>
            {banner ? (
                <p
                    className={`text-sm mt-2 mb-0${banner.kind === "err" ? " admin-form__err" : ""}`}
                    role={banner.kind === "err" ? "alert" : "status"}
                >
                    {banner.text}
                </p>
            ) : null}
        </form>
    );
}
