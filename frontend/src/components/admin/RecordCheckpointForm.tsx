"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Connection, PublicKey } from "@solana/web3.js";

import { CheckpointMetadataField } from "@/components/admin/CheckpointMetadataField";
import { GeoPointField, type LocationInputMode } from "@/components/admin/GeoPointField";
import {
    buildCheckpointMetadataJson,
    EMPTY_CHECKPOINT_METADATA_FORM,
    type CheckpointMetadataFormState,
} from "@/lib/checkpoint/checkpointMetadata";
import { apiBaseHasV1Prefix, normalizeApiBaseUrl } from "@/lib/api/backendConnectivity";
import { loadCheckpointSelectOptions } from "@/lib/api/catalogs";
import { postCheckpointsSync } from "@/lib/api/sync";
import { getPublicConfig } from "@/lib/env";
import { parseGeoPoint, type GeoPoint } from "@/lib/geo/geoPoint";
import {
    catalogSourceLabel,
    syncSuccessCopy,
    userFacingChainError,
    userMessageForSyncFailure,
} from "@/lib/panel/etapa1UserMessages";
import {
    checkpointTypeCodesForRole,
    recordCheckpointRoleHint,
} from "@/lib/panel/capabilities";
import type { CatalogOptionRow } from "@/lib/solana/catalogCodeMap";
import { confirmSerializedTx } from "@/lib/solana/confirmSerializedTx";
import type { CheckpointTypeCode } from "@/lib/solana/ix";
import { CheckpointTypeCode as Cp } from "@/lib/solana/ix";
import { createRecordCheckpointIx } from "@/lib/solana/instructions";
import { validateRecordCheckpointPreflight } from "@/lib/solana/chainPreflight";
import { fetchProgramConfig } from "@/lib/solana/program_config";
import {
    formatMeterSnapshotSummary,
    humidityPctToChain,
    meterSnapshotToFormFields,
    parseCheckpointHumidityForChain,
    parseCheckpointTemperatureForChain,
    temperatureCelsiusToChain,
    type MeterSnapshot,
} from "@/lib/telemetry/meterSnapshot";
import { useMeterSnapshot } from "@/lib/telemetry/useMeterSnapshot";

const FALLBACK_CP_ROWS: CatalogOptionRow<CheckpointTypeCode>[] = [
    { code: "Pickup", label: "Pickup", value: Cp.Pickup },
    { code: "HubIn", label: "HubIn", value: Cp.HubIn },
    { code: "HubOut", label: "HubOut", value: Cp.HubOut },
    { code: "Transit", label: "Transit", value: Cp.Transit },
    { code: "DeliveryAttempt", label: "DeliveryAttempt", value: Cp.DeliveryAttempt },
    { code: "Delivered", label: "Delivered", value: Cp.Delivered },
    { code: "SensorData", label: "SensorData", value: Cp.SensorData },
];

function coordsForChain(p: GeoPoint | null): { lat: number | null; lng: number | null } {
    if (!p) {
        return { lat: null, lng: null };
    }
    return { lat: Math.round(p.lat), lng: Math.round(p.lng) };
}

function resolveMeterValuesForSubmit(
    snapshot: MeterSnapshot | null,
    coordValue: string,
    coordMode: LocationInputMode,
    temp: string,
    humidity: string,
): {
    coords: GeoPoint | null;
    temperature: number | null;
    humidity: number | null;
} {
    const coords =
        snapshot?.coordinates ??
        (coordMode === "coordinates" ? parseGeoPoint(coordValue) : null);
    const temperature =
        snapshot?.temperatureCelsius != null
            ? temperatureCelsiusToChain(snapshot.temperatureCelsius)
            : parseCheckpointTemperatureForChain(temp);
    const hum =
        snapshot?.humidityPct != null
            ? humidityPctToChain(snapshot.humidityPct)
            : parseCheckpointHumidityForChain(humidity);
    return { coords, temperature, humidity: hum };
}

export type RecordCheckpointFormProps = {
    connection: Connection;
    programId: PublicKey;
    payer: PublicKey;
    shipmentPda: PublicKey;
    onChainShipmentId: string;
    shipmentServiceId: string;
    apiBaseUrl: string;
    wallet: string;
    role: string | null;
    onSuccess: () => void;
};

export function RecordCheckpointForm({
    connection,
    programId,
    payer,
    shipmentPda,
    onChainShipmentId,
    shipmentServiceId,
    apiBaseUrl,
    wallet,
    role,
    onSuccess,
}: RecordCheckpointFormProps) {
    const cfg = useMemo(() => getPublicConfig(), []);
    const apiBaseTrimmed = useMemo(() => normalizeApiBaseUrl(cfg.apiBaseUrl ?? ""), [cfg.apiBaseUrl]);
    const apiBaseWellFormed = useMemo(
        () => apiBaseTrimmed !== "" && apiBaseHasV1Prefix(apiBaseTrimmed),
        [apiBaseTrimmed],
    );

    const [cpType, setCpType] = useState<CheckpointTypeCode>(Cp.Pickup);
    const [cpLocation, setCpLocation] = useState("");
    const [coordValue, setCoordValue] = useState("");
    const [coordMode, setCoordMode] = useState<LocationInputMode>("coordinates");
    const [temp, setTemp] = useState("");
    const [humidity, setHumidity] = useState("");
    const [metadataForm, setMetadataForm] = useState<CheckpointMetadataFormState>(
        EMPTY_CHECKPOINT_METADATA_FORM,
    );
    const [apiCpRows, setApiCpRows] = useState<CatalogOptionRow<CheckpointTypeCode>[] | null>(null);
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

    const {
        snapshot: meterSnapshot,
        loading: metersLoading,
        error: metersError,
        info: metersInfo,
        sampleMeters,
    } = useMeterSnapshot(
        apiBaseWellFormed ? apiBaseTrimmed : undefined,
        shipmentServiceId,
        wallet,
    );

    const applySnapshotToForm = useCallback((snap: MeterSnapshot) => {
        const fields = meterSnapshotToFormFields(snap);
        if (fields.coordValue) {
            setCoordValue(fields.coordValue);
            setCoordMode("coordinates");
        }
        if (fields.temp) {
            setTemp(fields.temp);
        }
        if (fields.humidity) {
            setHumidity(fields.humidity);
        }
    }, []);

    useEffect(() => {
        if (meterSnapshot) {
            applySnapshotToForm(meterSnapshot);
        }
    }, [meterSnapshot, applySnapshotToForm]);

    const onSampleMeters = useCallback(async () => {
        const fresh = await sampleMeters();
        if (fresh) {
            applySnapshotToForm(fresh);
        }
    }, [sampleMeters, applySnapshotToForm]);

    const allCpRows = apiCpRows ?? FALLBACK_CP_ROWS;
    const allowedCodes = checkpointTypeCodesForRole(role);
    const cpRows = useMemo(() => {
        if (!allowedCodes) {
            return allCpRows;
        }
        const filtered = allCpRows.filter((o) => allowedCodes.includes(o.code));
        return filtered.length > 0 ? filtered : allCpRows;
    }, [allCpRows, allowedCodes]);

    const selectedCpType =
        cpRows.find((o) => o.value === cpType)?.value ?? cpRows[0]?.value ?? Cp.Pickup;

    useEffect(() => {
        let cancel = false;
        if (!apiBaseTrimmed || !apiBaseWellFormed) {
            queueMicrotask(() => {
                if (!cancel) {
                    setApiCpRows(null);
                    setCatalogsLoading(false);
                }
            });
            return () => {
                cancel = true;
            };
        }
        queueMicrotask(() => {
            if (!cancel) setCatalogsLoading(true);
        });
        void loadCheckpointSelectOptions(apiBaseTrimmed).then((opts) => {
            if (!cancel) {
                setApiCpRows(opts.length > 0 ? opts : null);
                setCatalogsLoading(false);
            }
        });
        return () => {
            cancel = true;
        };
    }, [apiBaseTrimmed, apiBaseWellFormed]);

    const onSubmit = useCallback(async () => {
        if (!cpLocation.trim()) {
            setBanner({ kind: "err", text: "Indique el lugar del evento." });
            return;
        }
        setBusy(true);
        setBanner(null);
        try {
            const preflightErr = await validateRecordCheckpointPreflight(
                connection,
                programId,
                payer,
                shipmentPda,
                onChainShipmentId,
            );
            if (preflightErr) {
                setBanner({ kind: "err", text: preflightErr });
                return;
            }
            const freshMeters = apiBaseWellFormed ? await sampleMeters() : null;
            const metersForTx = freshMeters ?? meterSnapshot;
            if (freshMeters) {
                applySnapshotToForm(freshMeters);
            }

            const cur = await fetchProgramConfig(connection, programId);
            if (!cur) throw new Error("Programa no activo");
            const nextCp = cur.decoded.checkpointsRecorded + BigInt(1);

            const { coords, temperature: tmpNum, humidity: humNum } = resolveMeterValuesForSubmit(
                metersForTx,
                coordValue,
                coordMode,
                temp,
                humidity,
            );
            const { lat: latNum, lng: lngNum } = coordsForChain(coords);
            const coordPreview = coords !== null ? { lat: coords.lat, lng: coords.lng } : null;
            const { json: metaOut, error: metaErr } = buildCheckpointMetadataJson(
                metadataForm,
                coordPreview,
            );
            if (metaErr) {
                setBanner({ kind: "err", text: metaErr });
                return;
            }
            const sig = await confirmSerializedTx(
                connection,
                payer,
                createRecordCheckpointIx({
                    programId,
                    authority: payer,
                    shipment: shipmentPda,
                    nextCheckpointIndex: nextCp,
                    checkpointType: selectedCpType,
                    location: cpLocation.trim(),
                    latitude: latNum,
                    longitude: lngNum,
                    temperature: tmpNum,
                    humidity: humNum,
                    metadata: metaOut,
                }),
            );
            if (apiBaseUrl.trim()) {
                const r = await postCheckpointsSync(apiBaseUrl, { tx_hash: sig });
                if (r.ok) {
                    setBanner({ kind: "ok", text: syncSuccessCopy.checkpoint });
                    onSuccess();
                } else {
                    setBanner({
                        kind: "err",
                        text: `${userMessageForSyncFailure("el evento", r.status, r.json)} La transacción on-chain sí se confirmó (${sig.slice(0, 8)}…).`,
                    });
                }
            } else {
                setBanner({
                    kind: "info",
                    text: "Evento registrado en cadena. Configure la API para sincronizar.",
                });
                onSuccess();
            }
        } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            setBanner({ kind: "err", text: userFacingChainError("record_checkpoint", m) });
        } finally {
            setBusy(false);
        }
    }, [
        connection,
        programId,
        payer,
        shipmentPda,
        onChainShipmentId,
        selectedCpType,
        cpLocation,
        coordValue,
        coordMode,
        temp,
        humidity,
        metadataForm,
        apiBaseUrl,
        apiBaseWellFormed,
        meterSnapshot,
        sampleMeters,
        applySnapshotToForm,
        onSuccess,
    ]);

    const footnote = catalogSourceLabel({
        loading: catalogsLoading,
        fromApi: Boolean(apiBaseWellFormed && apiCpRows),
    });

    const meterSummary = meterSnapshot ? formatMeterSnapshotSummary(meterSnapshot) : null;

    return (
        <form
            className="admin-form"
            onSubmit={(e) => {
                e.preventDefault();
                void onSubmit();
            }}
        >
            <p className="text-sm text-muted mb-2">
                Envío on-chain <span className="mono">#{onChainShipmentId}</span>
                {role ? (
                    <>
                        {" "}
                        · rol <span className="badge badge--neutral">{role}</span>
                    </>
                ) : null}
            </p>
            <p className="text-sm text-muted mb-2">{recordCheckpointRoleHint(role)}</p>
            <p className="text-sm text-muted mb-2">{footnote}</p>

            {apiBaseWellFormed ? (
                <div className="admin-form__meters" role="region" aria-label="Lecturas de medidores">
                    <div className="admin-form__meters-head">
                        <span className="admin-form__meters-title">Medidores simulados</span>
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={busy || metersLoading}
                            onClick={() => void onSampleMeters()}
                        >
                            {metersLoading ? "Ejecutando…" : "Ejecutar medidores"}
                        </button>
                    </div>
                    {metersError ? (
                        <p className="text-sm admin-form__err mb-0" role="alert">
                            {metersError}
                        </p>
                    ) : metersInfo ? (
                        <p className="text-sm text-muted mb-0" role="status">
                            {metersInfo}
                        </p>
                    ) : meterSummary ? (
                        <p className="text-sm text-muted mb-0">
                            Al registrar se usarán: <span className="mono">{meterSummary}</span>
                        </p>
                    ) : (
                        <p className="text-sm text-muted mb-0" role="status">
                            Sin telemetría reciente para este envío. El monitoreo activo genera
                            lecturas periódicas; puede actualizar antes de firmar.
                        </p>
                    )}
                </div>
            ) : null}

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="admin-cp-type">Tipo de evento</label>
                    <select
                        id="admin-cp-type"
                        className="select"
                        value={selectedCpType}
                        disabled={catalogsLoading || busy}
                        onChange={(e) => setCpType(Number(e.target.value) as CheckpointTypeCode)}
                    >
                        {cpRows.map((o) => (
                            <option key={o.code} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="admin-cp-loc">Lugar</label>
                    <input
                        id="admin-cp-loc"
                        className="input"
                        value={cpLocation}
                        disabled={busy}
                        onChange={(e) => setCpLocation(e.target.value)}
                    />
                </div>
            </div>
            <GeoPointField
                id="admin-cp-coords"
                label="Coordenadas del evento"
                value={coordValue}
                onChange={setCoordValue}
                disabled={busy}
                mode={coordMode}
                onModeChange={setCoordMode}
            />
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="admin-cp-temp">Temp. °C</label>
                    <input
                        id="admin-cp-temp"
                        className="input mono"
                        value={temp}
                        disabled={busy}
                        onChange={(e) => setTemp(e.target.value)}
                        placeholder="Desde medidor"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="admin-cp-hum">Humedad %</label>
                    <input
                        id="admin-cp-hum"
                        className="input mono"
                        value={humidity}
                        disabled={busy}
                        onChange={(e) => setHumidity(e.target.value)}
                        placeholder="Desde medidor"
                    />
                </div>
            </div>
            <CheckpointMetadataField
                value={metadataForm}
                onChange={setMetadataForm}
                disabled={busy}
                previewCoords={
                    coordMode === "coordinates" ? parseGeoPoint(coordValue) : null
                }
            />

            <button
                type="submit"
                className={`btn btn--primary btn--block${busy ? " is-busy" : ""}`}
                disabled={busy || !cpLocation.trim()}
                aria-busy={busy}
            >
                {busy ? "Firmando…" : "Registrar evento"}
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
