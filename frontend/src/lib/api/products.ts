/**
 * Cliente GET hacia `/api/v1/catalogs/products` (catálogo de productos).
 */

export type ProductCatalogItem = {
    code: string;
    label: string;
    description: string;
    requiresColdChain: boolean;
    packagingType: string;
    packagingLabel: string;
    category: string;
    sortOrder: number;
};

export type ProductsGetResult =
    | { ok: true; status: number; data: ProductCatalogItem[] }
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
    return typeof v === "string" ? v.trim() : "";
}

function asBool(v: unknown): boolean {
    return v === true;
}

function asNumber(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) {
        return v;
    }
    const n = Number.parseInt(String(v ?? 0), 10);
    return Number.isFinite(n) ? n : 0;
}

export function parseProductCatalogResponse(json: unknown): ProductCatalogItem[] {
    if (!Array.isArray(json)) {
        return [];
    }
    const out: ProductCatalogItem[] = [];
    for (const el of json) {
        const o = asRecord(el);
        if (!o) {
            continue;
        }
        const code = asString(o.code);
        const label = asString(o.label);
        if (!code || !label) {
            continue;
        }
        out.push({
            code,
            label,
            description: asString(o.description),
            requiresColdChain: asBool(o.requiresColdChain),
            packagingType: asString(o.packagingType),
            packagingLabel: asString(o.packagingLabel),
            category: asString(o.category),
            sortOrder: asNumber(o.sortOrder),
        });
    }
    return out;
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

export async function getProductsCatalog(
    apiBaseUrl: string,
    signal?: AbortSignal,
): Promise<ProductsGetResult> {
    const url = joinBase(apiBaseUrl, "catalogs/products");
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
    });
    const body = await parseJson(res);
    if (!res.ok) {
        return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, data: parseProductCatalogResponse(body) };
}
