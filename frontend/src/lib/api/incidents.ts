/**
 * Cliente GET hacia `/api/v1/shipments/:id/incidents`.
 */

export type IncidentItem = {
    id: string;
    shipmentId: string;
    incidentType: string;
    severity: string;
    status: string;
    source: string;
    description: string;
    detectedAt: string;
    resolvedAt: string | null;
    ruleName: string | null;
    txHash: string | null;
};

export type IncidentsGetResult =
    | { ok: true; status: number; data: IncidentItem[] }
    | { ok: false; status: number; body: unknown };

export type IncidentResolveResult =
    | { ok: true; status: number; data: IncidentItem }
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

export function parseIncidentItem(raw: unknown): IncidentItem | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const id = asString(o.id);
    const shipmentId = asString(o.shipmentId);
    const incidentType = asString(o.incidentType);
    const severity = asString(o.severity);
    const status = asString(o.status);
    const source = asString(o.source);
    const description = asString(o.description);
    const detectedAt = asString(o.detectedAt);
    if (!id || !shipmentId || !incidentType || !detectedAt) {
        return null;
    }
    return {
        id,
        shipmentId,
        incidentType,
        severity,
        status,
        source,
        description,
        detectedAt,
        resolvedAt: o.resolvedAt === null || o.resolvedAt === undefined ? null : asString(o.resolvedAt),
        ruleName:
            o.ruleName === null || o.ruleName === undefined ? null : asString(o.ruleName) || null,
        txHash: o.txHash === null || o.txHash === undefined ? null : asString(o.txHash) || null,
    };
}

export async function getShipmentIncidents(
    apiBaseUrl: string,
    shipmentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<IncidentsGetResult> {
    const path = `shipments/${encodeURIComponent(shipmentId)}/incidents`;
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
    const data: IncidentItem[] = [];
    for (const el of list) {
        const item = parseIncidentItem(el);
        if (item) {
            data.push(item);
        }
    }
    return { ok: true, status: res.status, data };
}

export async function postResolveIncident(
    apiBaseUrl: string,
    incidentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<IncidentResolveResult> {
    const path = `incidents/${encodeURIComponent(incidentId)}/resolve`;
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
    const item = parseIncidentItem(body);
    if (!item) {
        return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, data: item };
}
