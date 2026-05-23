/**
 * Cliente HTTP hacia endpoints Etapa 1 (`§8`): cuerpo snake_case `{ tx_hash, commitment }`.
 */

export type SyncRequestBodySnake = {
    tx_hash: string;
    commitment?: string;
};

/** Detalles off-chain en `POST /shipments/sync` (snake_case). */
export type ShipmentSyncDetailsSnake = {
    weight_kg?: number;
    quantity?: number;
    quantity_unit?: string;
    estimated_delivery_at?: string;
    reference_code?: string;
    priority?: string;
    notes?: string;
};

export type ShipmentSyncRequestBody = SyncRequestBodySnake & {
    details?: ShipmentSyncDetailsSnake;
};

function joinBase(apiBaseUrl: string, pathSegment: string): string {
    const base = apiBaseUrl.replace(/\/+$/, "");
    const path = pathSegment.replace(/^\/+/, "");
    return `${base}/${path}`;
}

async function parseJsonBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export type SyncCallResult<T = unknown> = {
    ok: boolean;
    status: number;
    /** Cuerpo parseado cuando es JSON */
    json: T | unknown | null;
    /** Texto bruto cuando no hay JSON válido */
    rawTextFallback?: string;
};

export async function postActorsSync(
    apiBaseUrl: string,
    body: SyncRequestBodySnake,
): Promise<SyncCallResult> {
    const url = joinBase(apiBaseUrl, "actors/sync");
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    const json = await parseJsonBody(res);
    return { ok: res.ok, status: res.status, json };
}

export async function postShipmentsSync(
    apiBaseUrl: string,
    body: ShipmentSyncRequestBody,
): Promise<SyncCallResult> {
    const url = joinBase(apiBaseUrl, "shipments/sync");
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    const json = await parseJsonBody(res);
    return { ok: res.ok, status: res.status, json };
}

export async function postCheckpointsSync(
    apiBaseUrl: string,
    body: SyncRequestBodySnake,
): Promise<SyncCallResult> {
    const url = joinBase(apiBaseUrl, "checkpoints/sync");
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    const json = await parseJsonBody(res);
    return { ok: res.ok, status: res.status, json };
}

export async function postIncidentsSync(
    apiBaseUrl: string,
    body: SyncRequestBodySnake,
): Promise<SyncCallResult> {
    const url = joinBase(apiBaseUrl, "incidents/sync");
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    const json = await parseJsonBody(res);
    return { ok: res.ok, status: res.status, json };
}
