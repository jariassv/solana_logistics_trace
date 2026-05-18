/**
 * Construcción de metadata JSON para `record_checkpoint` (on-chain, máx. 512 bytes).
 * El backend almacena el string tal cual y lo expone en la API sin esquema rígido.
 */

export const CHECKPOINT_METADATA_MAX_BYTES = 512;

export type CheckpointMetadataTag = {
    id: string;
    label: string;
    group: "estado" | "incidencia" | "operacion";
};

export const CHECKPOINT_METADATA_TAGS: CheckpointMetadataTag[] = [
    { id: "cargo_verified", label: "Carga verificada", group: "estado" },
    { id: "docs_complete", label: "Documentación completa", group: "estado" },
    { id: "cold_chain_ok", label: "Cadena de frío conforme", group: "estado" },
    { id: "on_time", label: "En horario", group: "estado" },
    { id: "seal_intact", label: "Precinto / sellado intacto", group: "estado" },
    { id: "delay_reported", label: "Retraso operativo", group: "incidencia" },
    { id: "packaging_damage", label: "Daño en embalaje", group: "incidencia" },
    { id: "recipient_unavailable", label: "Destinatario no disponible", group: "incidencia" },
    { id: "partial_delivery", label: "Entrega parcial", group: "incidencia" },
    { id: "hub_transfer", label: "Transferencia en hub", group: "operacion" },
    { id: "customs_cleared", label: "Liberado en aduana", group: "operacion" },
    { id: "photo_evidence", label: "Evidencia fotográfica", group: "operacion" },
];

const GROUP_LABELS: Record<CheckpointMetadataTag["group"], string> = {
    estado: "Estado del envío",
    incidencia: "Incidencias",
    operacion: "Operación",
};

export type CheckpointMetadataFormState = {
    selectedTagIds: string[];
    comment: string;
};

export const EMPTY_CHECKPOINT_METADATA_FORM: CheckpointMetadataFormState = {
    selectedTagIds: [],
    comment: "",
};

export function checkpointMetadataGroupLabel(group: CheckpointMetadataTag["group"]): string {
    return GROUP_LABELS[group];
}

export function tagsByGroup(): { group: CheckpointMetadataTag["group"]; tags: CheckpointMetadataTag[] }[] {
    const order: CheckpointMetadataTag["group"][] = ["estado", "incidencia", "operacion"];
    return order.map((group) => ({
        group,
        tags: CHECKPOINT_METADATA_TAGS.filter((t) => t.group === group),
    }));
}

export type CheckpointMetadataPayload = {
    tags?: string[];
    notes?: string;
    lat?: number;
    lng?: number;
    [key: string]: unknown;
};

/** Objeto metadata listo para serializar (sin coords). */
export function buildCheckpointMetadataObject(
    form: CheckpointMetadataFormState,
): CheckpointMetadataPayload {
    const payload: CheckpointMetadataPayload = {};
    if (form.selectedTagIds.length > 0) {
        payload.tags = [...form.selectedTagIds].sort();
    }
    const notes = form.comment.trim();
    if (notes) {
        payload.notes = notes;
    }
    return payload;
}

export function serializeCheckpointMetadata(payload: CheckpointMetadataPayload): string {
    if (Object.keys(payload).length === 0) {
        return "";
    }
    return JSON.stringify(payload);
}

export function mergeCoordsIntoMetadataPayload(
    payload: CheckpointMetadataPayload,
    lat: number,
    lng: number,
): CheckpointMetadataPayload {
    return { ...payload, lat, lng };
}

export function checkpointMetadataByteLength(json: string): number {
    return new TextEncoder().encode(json).length;
}

export function validateCheckpointMetadataJson(json: string): string | null {
    if (!json) {
        return null;
    }
    const len = checkpointMetadataByteLength(json);
    if (len > CHECKPOINT_METADATA_MAX_BYTES) {
        return `La metadata supera ${CHECKPOINT_METADATA_MAX_BYTES} bytes (${len}). Reduzca las opciones o el comentario.`;
    }
    return null;
}

export function buildCheckpointMetadataJson(
    form: CheckpointMetadataFormState,
    coords: { lat: number; lng: number } | null,
): { json: string; error: string | null } {
    let payload = buildCheckpointMetadataObject(form);
    if (coords) {
        payload = mergeCoordsIntoMetadataPayload(payload, coords.lat, coords.lng);
    }
    const json = serializeCheckpointMetadata(payload);
    const error = validateCheckpointMetadataJson(json);
    return { json, error };
}

export function toggleMetadataTag(
    selected: string[],
    tagId: string,
    checked: boolean,
): string[] {
    if (checked) {
        return selected.includes(tagId) ? selected : [...selected, tagId];
    }
    return selected.filter((id) => id !== tagId);
}
