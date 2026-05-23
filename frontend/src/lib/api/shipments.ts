/**
 * Cliente GET hacia `/api/v1/shipments*` y `actors/me` (Etapa 2 §8.2 — respuestas camelCase).
 */

function joinBase(apiBaseUrl: string, pathSegment: string): string {
    const base = apiBaseUrl.replace(/\/+$/, "");
    const path = pathSegment.replace(/^\/+/, "");
    return `${base}/${path}`;
}

function encodeQuery(params: Record<string, string>): string {
    const usp = new URLSearchParams(params);
    const s = usp.toString();
    return s ? `?${s}` : "";
}

export type ShipmentListItem = {
    shipmentId: string;
    onChainShipmentId: string;
    status: string;
    product: string;
    createdAt: string;
    requiresColdChain: boolean;
};

export type WalletParticipant = {
    wallet: string;
    walletMasked: string;
    displayName: string;
    role: string | null;
};

export type CheckpointItem = {
    checkpointId: string;
    onChainCheckpointId: string;
    type: string;
    occurredAt: string;
    location: string | null;
    actor: string;
    actorWalletMasked: string;
    actorDisplayName: string;
    actorRole: string | null;
    temperatureCenti: number | null;
    humidity: number | null;
    latitude: number | null;
    longitude: number | null;
    metadata: Record<string, unknown>;
    txHash: string;
};

export type ShipmentDetail = {
    shipmentId: string;
    onChainShipmentId: string;
    creationTxHash: string;
    displayLabel: string | null;
    product: string;
    productLabel: string | null;
    origin: string;
    destination: string;
    sender: string;
    recipient: string;
    senderParticipant: WalletParticipant;
    recipientParticipant: WalletParticipant;
    status: string;
    requiresColdChain: boolean;
    createdAt: string;
    deliveredAt: string | null;
    checkpointCount: number;
    incidentCount: number;
    openIncidentCount: number;
    weightKg: number | null;
    quantity: number | null;
    quantityUnit: string | null;
    estimatedDeliveryAt: string | null;
    referenceCode: string | null;
    priority: string;
    notes: string | null;
    checkpoints: CheckpointItem[];
    incidents: unknown[];
};

export type ActorMe = {
    wallet: string;
    role: string;
    name: string;
    location: string | null;
    registrationTxHash: string;
};

export type ShipmentGetResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; body: unknown };

function asRecord(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

function asBool(v: unknown): boolean | null {
    return typeof v === "boolean" ? v : null;
}

function asNum(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseCheckpointItem(raw: unknown): CheckpointItem | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const checkpointId = asString(o.checkpointId);
    const onChainCheckpointId = asString(o.onChainCheckpointId);
    const type = asString(o.type);
    const occurredAt = asString(o.occurredAt);
    const actor = asString(o.actor);
    const txHash = asString(o.txHash);
    if (!checkpointId || !onChainCheckpointId || !type || !occurredAt || !actor || !txHash) {
        return null;
    }
    const actorWalletMasked = asString(o.actorWalletMasked) || actor;
    const actorDisplayName = asString(o.actorDisplayName) || actorWalletMasked;
    const actorRole =
        o.actorRole === null || o.actorRole === undefined ? null : asString(o.actorRole) || null;
    const metadataRaw = o.metadata;
    const metadata =
        typeof metadataRaw === "object" && metadataRaw !== null && !Array.isArray(metadataRaw)
            ? (metadataRaw as Record<string, unknown>)
            : {};
    return {
        checkpointId,
        onChainCheckpointId,
        type,
        occurredAt,
        location: o.location === null || o.location === undefined ? null : String(o.location),
        actor,
        actorWalletMasked,
        actorDisplayName,
        actorRole,
        temperatureCenti: asNum(o.temperatureCenti),
        humidity: asNum(o.humidity),
        latitude: asNum(o.latitude),
        longitude: asNum(o.longitude),
        metadata,
        txHash,
    };
}

function parseShipmentListItem(raw: unknown): ShipmentListItem | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const shipmentId = asString(o.shipmentId);
    const onChainShipmentId = asString(o.onChainShipmentId);
    const status = asString(o.status);
    const product = asString(o.product);
    const createdAt = asString(o.createdAt);
    const requiresColdChain = asBool(o.requiresColdChain);
    if (!shipmentId || !onChainShipmentId || !status || !product || !createdAt || requiresColdChain === null) {
        return null;
    }
    return {
        shipmentId,
        onChainShipmentId,
        status,
        product,
        createdAt,
        requiresColdChain,
    };
}

export function parseWalletParticipant(raw: unknown, fallbackWallet: string): WalletParticipant {
    const o = asRecord(raw);
    if (!o) {
        const masked =
            fallbackWallet.length > 10
                ? `${fallbackWallet.slice(0, 4)}…${fallbackWallet.slice(-4)}`
                : fallbackWallet;
        return {
            wallet: fallbackWallet,
            walletMasked: masked,
            displayName: masked,
            role: null,
        };
    }
    const wallet = asString(o.wallet) || fallbackWallet;
    const walletMasked = asString(o.walletMasked) || wallet;
    const displayName = asString(o.displayName) || walletMasked;
    const role =
        o.role === null || o.role === undefined ? null : asString(o.role) || null;
    return { wallet, walletMasked, displayName, role };
}

export function parseShipmentDetail(raw: unknown): ShipmentDetail | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const shipmentId = asString(o.shipmentId);
    const onChainShipmentId = asString(o.onChainShipmentId);
    const creationTxHash = asString(o.creationTxHash);
    const product = asString(o.product);
    const origin = asString(o.origin);
    const destination = asString(o.destination);
    const sender = asString(o.sender);
    const recipient = asString(o.recipient);
    const status = asString(o.status);
    const createdAt = asString(o.createdAt);
    const requiresColdChain = asBool(o.requiresColdChain);
    const checkpointCount = asNum(o.checkpointCount);
    const incidentCount = asNum(o.incidentCount);
    const productLabel =
        o.productLabel === null || o.productLabel === undefined
            ? null
            : asString(o.productLabel) || null;
    if (
        !shipmentId ||
        !onChainShipmentId ||
        !creationTxHash ||
        !product ||
        !origin ||
        !destination ||
        !sender ||
        !recipient ||
        !status ||
        !createdAt ||
        requiresColdChain === null ||
        checkpointCount === null ||
        incidentCount === null
    ) {
        return null;
    }
    const openIncidentCount = asNum(o.openIncidentCount) ?? incidentCount;
    const senderParticipant = parseWalletParticipant(o.senderParticipant, sender);
    const recipientParticipant = parseWalletParticipant(o.recipientParticipant, recipient);
    const checkpointsRaw = o.checkpoints;
    const checkpoints: CheckpointItem[] = [];
    if (Array.isArray(checkpointsRaw)) {
        for (const c of checkpointsRaw) {
            const p = parseCheckpointItem(c);
            if (p) {
                checkpoints.push(p);
            }
        }
    }
    const displayLabel =
        o.displayLabel === null || o.displayLabel === undefined ? null : String(o.displayLabel);
    const deliveredAt =
        o.deliveredAt === null || o.deliveredAt === undefined ? null : String(o.deliveredAt);
    const incidents = Array.isArray(o.incidents) ? o.incidents : [];
    const weightKg = asNum(o.weightKg);
    const quantity = asNum(o.quantity);
    const quantityUnit =
        o.quantityUnit === null || o.quantityUnit === undefined
            ? null
            : asString(o.quantityUnit) || null;
    const estimatedDeliveryAt =
        o.estimatedDeliveryAt === null || o.estimatedDeliveryAt === undefined
            ? null
            : asString(o.estimatedDeliveryAt) || null;
    const referenceCode =
        o.referenceCode === null || o.referenceCode === undefined
            ? null
            : asString(o.referenceCode) || null;
    const priority = asString(o.priority) ?? "normal";
    const notes =
        o.notes === null || o.notes === undefined ? null : asString(o.notes) || null;
    return {
        shipmentId,
        onChainShipmentId,
        creationTxHash,
        displayLabel,
        product,
        productLabel,
        origin,
        destination,
        sender,
        recipient,
        senderParticipant,
        recipientParticipant,
        status,
        requiresColdChain,
        createdAt,
        deliveredAt,
        checkpointCount,
        incidentCount,
        openIncidentCount,
        weightKg,
        quantity,
        quantityUnit,
        estimatedDeliveryAt,
        referenceCode,
        priority,
        notes,
        checkpoints,
        incidents,
    };
}

function parseActorMe(raw: unknown): ActorMe | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const wallet = asString(o.wallet);
    const role = asString(o.role);
    const name = asString(o.name);
    const registrationTxHash =
        typeof o.registrationTxHash === "string" ? o.registrationTxHash : "";
    if (!wallet || !role || !name) {
        return null;
    }
    const location =
        o.location === null || o.location === undefined ? null : String(o.location);
    return { wallet, role, name, location, registrationTxHash };
}

async function parseJson(res: Response): Promise<unknown> {
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

export async function getShipmentsForWallet(
    apiBaseUrl: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<ShipmentGetResult<ShipmentListItem[]>> {
    const url = joinBase(apiBaseUrl, `shipments${encodeQuery({ wallet })}`);
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const body = await parseJson(res);
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    if (!Array.isArray(body)) {
        return { ok: false, status: res.status, body };
    }
    const out: ShipmentListItem[] = [];
    for (const row of body) {
        const p = parseShipmentListItem(row);
        if (p) {
            out.push(p);
        }
    }
    return { ok: true, status: res.status, data: out };
}

export async function getShipmentDetail(
    apiBaseUrl: string,
    shipmentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<ShipmentGetResult<ShipmentDetail>> {
    const url = joinBase(
        apiBaseUrl,
        `shipments/${encodeURIComponent(shipmentId)}${encodeQuery({ wallet })}`,
    );
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const body = await parseJson(res);
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    const detail = parseShipmentDetail(body);
    if (!detail) {
        return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, data: detail };
}

export async function getShipmentCheckpoints(
    apiBaseUrl: string,
    shipmentId: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<ShipmentGetResult<CheckpointItem[]>> {
    const url = joinBase(
        apiBaseUrl,
        `shipments/${encodeURIComponent(shipmentId)}/checkpoints${encodeQuery({ wallet })}`,
    );
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const body = await parseJson(res);
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    if (!Array.isArray(body)) {
        return { ok: false, status: res.status, body };
    }
    const out: CheckpointItem[] = [];
    for (const row of body) {
        const p = parseCheckpointItem(row);
        if (p) {
            out.push(p);
        }
    }
    return { ok: true, status: res.status, data: out };
}

export async function getActorMe(
    apiBaseUrl: string,
    wallet: string,
    signal?: AbortSignal,
): Promise<ShipmentGetResult<ActorMe>> {
    const url = joinBase(apiBaseUrl, `actors/me${encodeQuery({ wallet })}`);
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const body = await parseJson(res);
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    const actor = parseActorMe(body);
    if (!actor) {
        return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, data: actor };
}
