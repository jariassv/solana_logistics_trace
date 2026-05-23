/** Detalles operativos del envío (off-chain, enviados en sync). */

export const SHIPMENT_QUANTITY_UNITS = [
    { value: "unidades", label: "Unidades" },
    { value: "cajas", label: "Cajas" },
    { value: "pallets", label: "Pallets" },
    { value: "bultos", label: "Bultos" },
] as const;

export const SHIPMENT_PRIORITIES = [
    { value: "normal", label: "Normal" },
    { value: "urgent", label: "Urgente" },
    { value: "express", label: "Express" },
] as const;

export type ShipmentPriority = (typeof SHIPMENT_PRIORITIES)[number]["value"];

export type ShipmentDetailsFormState = {
    weightKg: string;
    quantity: string;
    quantityUnit: string;
    estimatedDeliveryLocal: string;
    referenceCode: string;
    priority: ShipmentPriority;
    notes: string;
};

export const EMPTY_SHIPMENT_DETAILS_FORM: ShipmentDetailsFormState = {
    weightKg: "",
    quantity: "",
    quantityUnit: "unidades",
    estimatedDeliveryLocal: "",
    referenceCode: "",
    priority: "normal",
    notes: "",
};

export type ShipmentSyncDetailsSnake = {
    weight_kg?: number;
    quantity?: number;
    quantity_unit?: string;
    estimated_delivery_at?: string;
    reference_code?: string;
    priority?: string;
    notes?: string;
};

const MIN_WEIGHT = 0.001;
const MAX_WEIGHT = 100_000;
const MIN_QTY = 1;
const MAX_QTY = 1_000_000;
const MAX_REF = 64;
const MAX_NOTES = 2000;

function parsePositiveFloat(raw: string): number | null {
    const t = raw.trim().replace(",", ".");
    if (!t) {
        return null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

function parsePositiveInt(raw: string): number | null {
    const t = raw.trim();
    if (!t || !/^\d+$/.test(t)) {
        return null;
    }
    const n = Number(t);
    return Number.isInteger(n) ? n : null;
}

/** Convierte valor de `<input type="datetime-local">` a ISO UTC. */
export function datetimeLocalToIsoUtc(local: string): string | null {
    const t = local.trim();
    if (!t) {
        return null;
    }
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) {
        return null;
    }
    return d.toISOString();
}

export function buildShipmentSyncDetails(
    form: ShipmentDetailsFormState,
): { details?: ShipmentSyncDetailsSnake; error?: string } {
    const out: ShipmentSyncDetailsSnake = {};
    let any = false;

    const w = parsePositiveFloat(form.weightKg);
    if (form.weightKg.trim()) {
        if (w == null || w < MIN_WEIGHT || w > MAX_WEIGHT) {
            return { error: `Peso: indique un valor entre ${MIN_WEIGHT} y ${MAX_WEIGHT} kg.` };
        }
        out.weight_kg = w;
        any = true;
    }

    const q = parsePositiveInt(form.quantity);
    if (form.quantity.trim()) {
        if (q == null || q < MIN_QTY || q > MAX_QTY) {
            return { error: `Cantidad: entero entre ${MIN_QTY} y ${MAX_QTY}.` };
        }
        out.quantity = q;
        any = true;
    }

    if (form.quantityUnit.trim() && form.quantity.trim()) {
        out.quantity_unit = form.quantityUnit.trim();
        any = true;
    }

    const eta = datetimeLocalToIsoUtc(form.estimatedDeliveryLocal);
    if (form.estimatedDeliveryLocal.trim()) {
        if (!eta) {
            return { error: "Fecha de entrega estimada no válida." };
        }
        out.estimated_delivery_at = eta;
        any = true;
    }

    const ref = form.referenceCode.trim();
    if (ref) {
        if (ref.length > MAX_REF) {
            return { error: `Referencia: máximo ${MAX_REF} caracteres.` };
        }
        out.reference_code = ref;
        any = true;
    }

    if (form.priority !== "normal") {
        out.priority = form.priority;
        any = true;
    }

    const notes = form.notes.trim();
    if (notes) {
        if (notes.length > MAX_NOTES) {
            return { error: `Notas: máximo ${MAX_NOTES} caracteres.` };
        }
        out.notes = notes;
        any = true;
    }

    return any ? { details: out } : {};
}

export function priorityLabel(priority: string): string {
    return SHIPMENT_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}

export function formatWeightKg(kg: number): string {
    return `${kg.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
}

export function formatQuantityLine(quantity: number, unit: string | null): string {
    const u = unit?.trim() || "unidades";
    return `${quantity.toLocaleString()} ${u}`;
}
