"use client";

import { useCallback, useEffect, useState } from "react";
import type { Connection, PublicKey } from "@solana/web3.js";
import { PublicKey as PK } from "@solana/web3.js";

import { getRecipientActors, type RecipientOption } from "@/lib/api/actors";
import { getLocationsCatalog, type LocationCatalogItem } from "@/lib/api/locations";
import { getProductsCatalog, type ProductCatalogItem } from "@/lib/api/products";
import { apiBaseHasV1Prefix, normalizeApiBaseUrl } from "@/lib/api/backendConnectivity";
import { postShipmentsSync } from "@/lib/api/sync";
import {
    buildShipmentSyncDetails,
    EMPTY_SHIPMENT_DETAILS_FORM,
    SHIPMENT_PRIORITIES,
    SHIPMENT_QUANTITY_UNITS,
    type ShipmentDetailsFormState,
    type ShipmentPriority,
} from "@/lib/shipment/shipmentDetailsForm";
import { parseGeoPoint } from "@/lib/geo/geoPoint";
import { locationToShipmentField } from "@/lib/geo/locationCatalog";
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

function applyLocationDefaults(
    locations: LocationCatalogItem[],
): { originCode: string; origin: string; destinationCode: string; destination: string } {
    const first = locations[0];
    if (!first) {
        return { originCode: "", origin: "", destinationCode: "", destination: "" };
    }
    const dest = locations.length > 1 ? locations[1]! : first;
    return {
        originCode: first.code,
        origin: locationToShipmentField(first),
        destinationCode: dest.code,
        destination: locationToShipmentField(dest),
    };
}

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
    const [productCode, setProductCode] = useState("");
    const [productOptions, setProductOptions] = useState<ProductCatalogItem[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
    const [originCode, setOriginCode] = useState("");
    const [destinationCode, setDestinationCode] = useState("");
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [locationOptions, setLocationOptions] = useState<LocationCatalogItem[]>([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [locationsLoadError, setLocationsLoadError] = useState<string | null>(null);
    const [coldChain, setColdChain] = useState(false);
    const [detailsForm, setDetailsForm] = useState<ShipmentDetailsFormState>(
        EMPTY_SHIPMENT_DETAILS_FORM,
    );
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
        if (!apiBaseWellFormed) {
            queueMicrotask(() => {
                if (!cancel) {
                    setProductOptions([]);
                    setProductCode("");
                    setProductsLoading(false);
                    setProductsLoadError(null);
                }
            });
            return () => {
                cancel = true;
            };
        }
        queueMicrotask(() => {
            if (!cancel) {
                setProductsLoading(true);
                setProductsLoadError(null);
            }
        });
        void getProductsCatalog(apiBaseTrimmed).then((res) => {
            if (cancel) {
                return;
            }
            if (res.ok) {
                setProductOptions(res.data);
                setProductsLoadError(null);
                if (res.data.length === 1) {
                    const only = res.data[0]!;
                    setProductCode(only.code);
                    setColdChain(only.requiresColdChain);
                }
            } else {
                setProductOptions([]);
                setProductCode("");
                setProductsLoadError("No se pudo cargar el catálogo de productos.");
            }
            setProductsLoading(false);
        });
        return () => {
            cancel = true;
        };
    }, [apiBaseTrimmed, apiBaseWellFormed]);

    useEffect(() => {
        let cancel = false;
        if (!apiBaseWellFormed) {
            queueMicrotask(() => {
                if (!cancel) {
                    setLocationOptions([]);
                    setOriginCode("");
                    setDestinationCode("");
                    setOrigin("");
                    setDestination("");
                    setLocationsLoading(false);
                    setLocationsLoadError(null);
                }
            });
            return () => {
                cancel = true;
            };
        }
        queueMicrotask(() => {
            if (!cancel) {
                setLocationsLoading(true);
                setLocationsLoadError(null);
            }
        });
        void getLocationsCatalog(apiBaseTrimmed).then((res) => {
            if (cancel) {
                return;
            }
            if (res.ok) {
                setLocationOptions(res.data);
                setLocationsLoadError(null);
                const defaults = applyLocationDefaults(res.data);
                setOriginCode(defaults.originCode);
                setOrigin(defaults.origin);
                setDestinationCode(defaults.destinationCode);
                setDestination(defaults.destination);
            } else {
                setLocationOptions([]);
                setOriginCode("");
                setDestinationCode("");
                setOrigin("");
                setDestination("");
                setLocationsLoadError("No se pudo cargar el catálogo de ubicaciones.");
            }
            setLocationsLoading(false);
        });
        return () => {
            cancel = true;
        };
    }, [apiBaseTrimmed, apiBaseWellFormed]);

    const selectedProduct = productOptions.find((p) => p.code === productCode) ?? null;

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

    const onSubmit = useCallback(async () => {
        const trimmedRec = recipient.trim();
        const recErr = recipientFieldValidationError(trimmedRec);
        if (recErr) {
            setRecipientIssue(recErr);
            return;
        }
        if (!originCode || !destinationCode) {
            setBanner({ kind: "err", text: "Seleccione origen y destino." });
            return;
        }
        if (!parseGeoPoint(origin) || !parseGeoPoint(destination)) {
            setBanner({ kind: "err", text: "Origen o destino con coordenadas inválidas." });
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

        const detailsPayload = buildShipmentSyncDetails(detailsForm);
        if (detailsPayload.error) {
            setBanner({ kind: "err", text: detailsPayload.error });
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
                product: (selectedProduct?.label ?? "").trim(),
                origin: origin.trim(),
                destination: destination.trim(),
                requiresColdChain: coldChain,
            });
            const sig = await confirmSerializedTx(connection, payer, ix);

            let syncOk = true;
            if (apiBaseUrl.trim()) {
                const r = await postShipmentsSync(apiBaseUrl, {
                    tx_hash: sig,
                    ...detailsPayload,
                });
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
        selectedProduct,
        origin,
        destination,
        coldChain,
        apiBaseUrl,
        onSuccess,
        originCode,
        destinationCode,
        senderActorReady,
        role,
        detailsForm,
    ]);

    const disabled =
        busy ||
        !productCode ||
        !originCode ||
        !destinationCode ||
        !recipient.trim() ||
        (productOptions.length === 0 && !productsLoading && apiBaseWellFormed) ||
        (locationOptions.length === 0 && !locationsLoading && apiBaseWellFormed) ||
        locationsLoading ||
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
                    <select
                        id="admin-ship-prod"
                        className="select"
                        value={productCode}
                        disabled={busy || productsLoading || productOptions.length === 0}
                        onChange={(e) => {
                            const code = e.target.value;
                            setProductCode(code);
                            const item = productOptions.find((p) => p.code === code);
                            if (item) {
                                setColdChain(item.requiresColdChain);
                            }
                        }}
                    >
                        <option value="">
                            {productsLoading
                                ? "Cargando productos…"
                                : productOptions.length === 0
                                  ? "Sin productos en catálogo"
                                  : "Seleccione un producto"}
                        </option>
                        {productOptions.map((p) => (
                            <option key={p.code} value={p.code}>
                                {p.label}
                                {p.category ? ` (${p.category})` : ""}
                            </option>
                        ))}
                    </select>
                    {productsLoadError ? (
                        <p className="text-sm admin-form__err mb-0 mt-1" role="alert">
                            {productsLoadError}
                        </p>
                    ) : null}
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

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="admin-ship-orig">Origen</label>
                    <select
                        id="admin-ship-orig"
                        className="select"
                        value={originCode}
                        disabled={busy || locationsLoading || locationOptions.length === 0}
                        onChange={(e) => {
                            const code = e.target.value;
                            setOriginCode(code);
                            const item = locationOptions.find((l) => l.code === code);
                            setOrigin(item ? locationToShipmentField(item) : "");
                        }}
                    >
                        <option value="">
                            {locationsLoading
                                ? "Cargando ubicaciones…"
                                : locationOptions.length === 0
                                  ? "Sin ubicaciones en catálogo"
                                  : "Seleccione origen"}
                        </option>
                        {locationOptions.map((l) => (
                            <option key={`orig-${l.code}`} value={l.code}>
                                {l.label} ({l.department})
                            </option>
                        ))}
                    </select>
                    {locationsLoadError ? (
                        <p className="text-sm admin-form__err mb-0 mt-1" role="alert">
                            {locationsLoadError}
                        </p>
                    ) : null}
                </div>
                <div className="form-group">
                    <label htmlFor="admin-ship-dest">Destino</label>
                    <select
                        id="admin-ship-dest"
                        className="select"
                        value={destinationCode}
                        disabled={busy || locationsLoading || locationOptions.length === 0}
                        onChange={(e) => {
                            const code = e.target.value;
                            setDestinationCode(code);
                            const item = locationOptions.find((l) => l.code === code);
                            setDestination(item ? locationToShipmentField(item) : "");
                        }}
                    >
                        <option value="">
                            {locationsLoading
                                ? "Cargando ubicaciones…"
                                : locationOptions.length === 0
                                  ? "Sin ubicaciones en catálogo"
                                  : "Seleccione destino"}
                        </option>
                        {locationOptions.map((l) => (
                            <option key={`dest-${l.code}`} value={l.code}>
                                {l.label} ({l.department})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <fieldset className="admin-form__section" disabled={busy}>
                <legend className="admin-form__section-title">Detalles del envío</legend>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="admin-ship-weight">Peso (kg)</label>
                        <input
                            id="admin-ship-weight"
                            className="input"
                            type="number"
                            min={0}
                            step="0.001"
                            inputMode="decimal"
                            placeholder="Ej. 24.5"
                            value={detailsForm.weightKg}
                            onChange={(e) =>
                                setDetailsForm((f) => ({ ...f, weightKg: e.target.value }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-ship-qty">Cantidad</label>
                        <input
                            id="admin-ship-qty"
                            className="input"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Ej. 120"
                            value={detailsForm.quantity}
                            onChange={(e) =>
                                setDetailsForm((f) => ({ ...f, quantity: e.target.value }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-ship-qty-unit">Unidad</label>
                        <select
                            id="admin-ship-qty-unit"
                            className="select"
                            value={detailsForm.quantityUnit}
                            onChange={(e) =>
                                setDetailsForm((f) => ({ ...f, quantityUnit: e.target.value }))
                            }
                        >
                            {SHIPMENT_QUANTITY_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                    {u.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="admin-ship-eta">Entrega estimada</label>
                        <input
                            id="admin-ship-eta"
                            className="input"
                            type="datetime-local"
                            value={detailsForm.estimatedDeliveryLocal}
                            onChange={(e) =>
                                setDetailsForm((f) => ({
                                    ...f,
                                    estimatedDeliveryLocal: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-ship-ref">Referencia / pedido</label>
                        <input
                            id="admin-ship-ref"
                            className="input"
                            maxLength={64}
                            placeholder="Ej. PO-2026-0042"
                            value={detailsForm.referenceCode}
                            onChange={(e) =>
                                setDetailsForm((f) => ({ ...f, referenceCode: e.target.value }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-ship-priority">Prioridad</label>
                        <select
                            id="admin-ship-priority"
                            className="select"
                            value={detailsForm.priority}
                            onChange={(e) =>
                                setDetailsForm((f) => ({
                                    ...f,
                                    priority: e.target.value as ShipmentPriority,
                                }))
                            }
                        >
                            {SHIPMENT_PRIORITIES.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-group mb-0">
                    <label htmlFor="admin-ship-notes">Notas / instrucciones</label>
                    <textarea
                        id="admin-ship-notes"
                        className="input"
                        rows={3}
                        maxLength={2000}
                        placeholder="Fragil, entregar en horario de mañana…"
                        value={detailsForm.notes}
                        onChange={(e) =>
                            setDetailsForm((f) => ({ ...f, notes: e.target.value }))
                        }
                    />
                </div>
            </fieldset>

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
