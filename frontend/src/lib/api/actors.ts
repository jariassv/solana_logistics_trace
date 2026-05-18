/**
 * Cliente GET hacia `/api/v1/actors*` (destinatarios para crear envíos).
 */

export type RecipientOption = {
    wallet: string;
    name: string;
    walletMasked: string;
    displayLabel: string;
};

export type ActorsGetResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; body: unknown };

function joinBase(apiBaseUrl: string, pathSegment: string): string {
    const base = apiBaseUrl.replace(/\/+$/, "");
    const path = pathSegment.replace(/^\/+/, "");
    return `${base}/${path}`;
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

function asRecord(v: unknown): Record<string, unknown> | null {
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

function parseRecipientOption(raw: unknown): RecipientOption | null {
    const o = asRecord(raw);
    if (!o) {
        return null;
    }
    const wallet = asString(o.wallet);
    const name = asString(o.name);
    const walletMasked = asString(o.walletMasked);
    const displayLabel = asString(o.displayLabel);
    if (!wallet || !name || !walletMasked || !displayLabel) {
        return null;
    }
    return { wallet, name, walletMasked, displayLabel };
}

export async function getRecipientActors(
    apiBaseUrl: string,
    signal?: AbortSignal,
): Promise<ActorsGetResult<RecipientOption[]>> {
    const url = joinBase(apiBaseUrl, "actors/recipients");
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
    const out: RecipientOption[] = [];
    for (const row of body) {
        const p = parseRecipientOption(row);
        if (p) {
            out.push(p);
        }
    }
    return { ok: true, status: res.status, data: out };
}
