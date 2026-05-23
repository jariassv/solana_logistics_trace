/**
 * Cliente GET hacia `/api/v1/shipments/:id/telemetry` (lectura off-chain).
 */

export type TelemetryEventItem = {
    id: string;
    shipmentId: string;
    telemetryType: string;
    valueNumeric: number | null;
    latitude: number | null;
    longitude: number | null;
    recordedAt: string;
};

export type TelemetryGetResult =
    | { ok: true; status: number; data: TelemetryEventItem[] }
    | { ok: false; status: number; body: unknown };

export type MeterSampleResult =
    | {
          ok: true;
          status: number;
          data: {
              monitoringActive: boolean;
              gpsRecorded: boolean;
              temperatureRecorded: boolean;
              humidityRecorded: boolean;
              readings: TelemetryEventItem[];
          };
      }
    | { ok: false; status: number; body: unknown };

function joinBase(apiBaseUrl: string, pathSegment: string): string {
    const base = apiBaseUrl.replace(/\/+$/, "");
    const path = pathSegment.replace(/^\/+/, "");
    return `${base}/${path}`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string {
    return typeof v === "string" ? v : "";
}

function asNum(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function parseTelemetryEvent(raw: unknown): TelemetryEventItem | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const id = asString(o.id);
    const shipmentId = asString(o.shipmentId);
    const telemetryType = asString(o.telemetryType);
    const recordedAt = asString(o.recordedAt);
    if (!id || !shipmentId || !telemetryType || !recordedAt) {
        return null;
    }
    return {
        id,
        shipmentId,
        telemetryType,
        valueNumeric: o.valueNumeric === null || o.valueNumeric === undefined ? null : asNum(o.valueNumeric),
        latitude: o.latitude === null || o.latitude === undefined ? null : asNum(o.latitude),
        longitude: o.longitude === null || o.longitude === undefined ? null : asNum(o.longitude),
        recordedAt,
    };
}

export async function getShipmentTelemetry(
    apiBaseUrl: string,
    shipmentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<TelemetryGetResult> {
    const path = `shipments/${encodeURIComponent(shipmentId)}/telemetry`;
    const url = `${joinBase(apiBaseUrl, path)}?wallet=${encodeURIComponent(wallet)}`;
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
        try {
            body = JSON.parse(text) as unknown;
        } catch {
            body = text;
        }
    }
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    const list = Array.isArray(body) ? body : [];
    const data: TelemetryEventItem[] = [];
    for (const el of list) {
        const item = parseTelemetryEvent(el);
        if (item) {
            data.push(item);
        }
    }
    return { ok: true, status: res.status, data };
}

export type MeterSamplePayload = {
    monitoringActive: boolean;
    gpsRecorded: boolean;
    temperatureRecorded: boolean;
    humidityRecorded: boolean;
    readings: TelemetryEventItem[];
};

function parseMeterSampleBody(body: unknown): MeterSamplePayload | null {
    const o = asRecord(body);
    if (!o) {
        return null;
    }
    const readingsRaw = o.readings;
    const readings: TelemetryEventItem[] = [];
    if (Array.isArray(readingsRaw)) {
        for (const el of readingsRaw) {
            const item = parseTelemetryEvent(el);
            if (item) {
                readings.push(item);
            }
        }
    }
    return {
        monitoringActive: o.monitoringActive === true,
        gpsRecorded: o.gpsRecorded === true,
        temperatureRecorded: o.temperatureRecorded === true,
        humidityRecorded: o.humidityRecorded === true,
        readings,
    };
}

export async function postSampleShipmentTelemetry(
    apiBaseUrl: string,
    shipmentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<MeterSampleResult> {
    const path = `shipments/${encodeURIComponent(shipmentId)}/telemetry/sample`;
    const url = `${joinBase(apiBaseUrl, path)}?wallet=${encodeURIComponent(wallet)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal,
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
        try {
            body = JSON.parse(text) as unknown;
        } catch {
            body = text;
        }
    }
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    const parsed = parseMeterSampleBody(body);
    if (!parsed) {
        return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, data: parsed };
}
