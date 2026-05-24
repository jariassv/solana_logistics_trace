/**
 * Línea de tiempo del ciclo logístico (estados + eventos on-chain).
 */

import type { CheckpointItem } from "@/lib/api/shipments";
import type { FlowStepState } from "@/lib/panel/shipmentLifecycle";
import { checkpointTypeLabel, formatOccurredAt } from "@/lib/shipments/checkpointDisplay";
import { statusLabel } from "@/lib/shipments/display";

export type JourneyStepIconKind =
    | "created"
    | "pickup"
    | "hub"
    | "transit"
    | "out"
    | "delivered";

export type JourneyEventStep = {
    id: string;
    label: string;
    icon: JourneyStepIconKind;
    checkpointTypes: readonly string[];
};

/** Orden de negocio: eventos que puede atravesar un envío en el MVP. */
export const JOURNEY_EVENT_STEPS: readonly JourneyEventStep[] = [
    { id: "created", label: "Creado", icon: "created", checkpointTypes: [] },
    { id: "pickup", label: "Recogida", icon: "pickup", checkpointTypes: ["Pickup"] },
    { id: "transit", label: "En tránsito", icon: "transit", checkpointTypes: ["Transit"] },
    { id: "hub", label: "En hub", icon: "hub", checkpointTypes: ["HubIn", "HubOut"] },
    { id: "out", label: "En reparto", icon: "out", checkpointTypes: ["DeliveryAttempt"] },
    {
        id: "delivered",
        label: "Entregado",
        icon: "delivered",
        checkpointTypes: ["Delivered"],
    },
] as const;

export type CoordEndpoint = {
    raw: string;
    label: string;
    lat: number | null;
    lng: number | null;
};

/** Parsea `origen` / `destino` almacenados como `"lat,lng"` o texto libre. */
export function parseCoordEndpoint(raw: string): CoordEndpoint {
    const trimmed = raw.trim();
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length === 2) {
        const lat = Number.parseFloat(parts[0]);
        const lng = Number.parseFloat(parts[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return {
                raw: trimmed,
                label: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
                lat,
                lng,
            };
        }
    }
    return { raw: trimmed, label: trimmed, lat: null, lng: null };
}

/** Id de etapa del rail según el estado operativo del envío. */
export function statusToJourneyStepId(status: string): string {
    const idx = statusToStepIndex(status);
    if (idx < 0) {
        return "created";
    }
    return JOURNEY_EVENT_STEPS[idx]?.id ?? "created";
}

/**
 * Etapa actual: prioriza el estado del envío (p. ej. InTransit → tránsito)
 * y usa el último checkpoint solo cuando el estado no define una etapa logística.
 */
export function resolveOperationalJourneyStepId(
    status: string,
    checkpoints: readonly CheckpointItem[],
): string {
    if (status !== "Created" && status !== "Cancelled" && status !== "Returned") {
        return statusToJourneyStepId(status);
    }
    return resolveNowStepId(checkpoints, "");
}

function statusToStepIndex(status: string): number {
    switch (status) {
        case "Created":
            return 0;
        case "InTransit":
            return 2;
        case "AtHub":
            return 3;
        case "OutForDelivery":
            return 4;
        case "Delivered":
            return 5;
        case "Returned":
        case "Cancelled":
            return -1;
        default:
            return 0;
    }
}

export type ResolvedJourneyStep = {
    step: JourneyEventStep;
    state: FlowStepState;
    eventRecorded: boolean;
};

export type JourneyStepInsight = {
    lines: string[];
};

function latestCheckpointForTypes(
    checkpoints: readonly CheckpointItem[],
    types: readonly string[],
): CheckpointItem | null {
    const allowed = new Set(types);
    let best: CheckpointItem | null = null;
    for (const c of checkpoints) {
        if (!allowed.has(c.type)) {
            continue;
        }
        if (!best || c.occurredAt > best.occurredAt) {
            best = c;
        }
    }
    return best;
}

export function buildJourneyStepInsight(
    step: JourneyEventStep,
    state: FlowStepState,
    checkpoints: readonly CheckpointItem[],
    createdAt: string,
): JourneyStepInsight {
    if (step.id === "created") {
        if (state === "future") {
            return { lines: ["Pendiente de registro"] };
        }
        return { lines: ["Envío creado", formatOccurredAt(createdAt)] };
    }

    const recorded = latestCheckpointForTypes(checkpoints, step.checkpointTypes);
    if (recorded) {
        const lines = [checkpointTypeLabel(recorded.type), formatOccurredAt(recorded.occurredAt)];
        if (recorded.location) {
            lines.push(recorded.location);
        }
        if (recorded.actorDisplayName) {
            lines.push(recorded.actorDisplayName);
        }
        return { lines };
    }

    if (state === "current") {
        return { lines: [step.label, "Etapa actual del envío"] };
    }
    if (state === "past") {
        return { lines: [step.label, "Etapa superada"] };
    }
    if (state === "offpath") {
        return { lines: [step.label, "Fuera del flujo habitual"] };
    }
    return { lines: [step.label, "Pendiente"] };
}

export function buildEndpointInsight(
    kind: "origin" | "destination",
    displayTitle: string,
    displaySubtitle: string | null,
    checkpoints: readonly CheckpointItem[],
): JourneyStepInsight {
    const related =
        kind === "origin"
            ? latestCheckpointForTypes(checkpoints, ["Pickup"])
            : latestCheckpointForTypes(checkpoints, ["Delivered", "DeliveryAttempt"]);
    const lines = [kind === "origin" ? "Origen" : "Destino", displayTitle];
    if (displaySubtitle) {
        lines.push(displaySubtitle);
    }
    if (related) {
        lines.push(`${checkpointTypeLabel(related.type)} · ${formatOccurredAt(related.occurredAt)}`);
    } else if (kind === "destination") {
        lines.push("Entrega pendiente");
    }
    return { lines };
}

export function checkpointTypeToJourneyStepId(type: string): string {
    switch (type) {
        case "Pickup":
            return "pickup";
        case "Transit":
            return "transit";
        case "HubIn":
        case "HubOut":
            return "hub";
        case "DeliveryAttempt":
            return "out";
        case "Delivered":
            return "delivered";
        default:
            return "created";
    }
}

/** Etapa del rail que corresponde al último evento logístico registrado. */
export function resolveNowStepId(
    checkpoints: readonly CheckpointItem[],
    _createdAt: string,
): string {
    const logistics = checkpoints.filter(
        (c) => c.type !== "SensorData" && !c.actor.startsWith("system@"),
    );
    if (logistics.length === 0) {
        return "created";
    }
    let latest = logistics[0]!;
    for (const c of logistics) {
        if (c.occurredAt > latest.occurredAt) {
            latest = c;
        }
    }
    return checkpointTypeToJourneyStepId(latest.type);
}

export function resolveJourneyStepStates(
    status: string,
    checkpointTypes: Iterable<string>,
): ResolvedJourneyStep[] {
    const recorded = new Set(checkpointTypes);
    const currentIdx = statusToStepIndex(status);
    const isException = status === "Cancelled" || status === "Returned";

    return JOURNEY_EVENT_STEPS.map((step, index) => {
        const eventRecorded =
            step.checkpointTypes.length > 0 &&
            step.checkpointTypes.some((t) => recorded.has(t));

        let state: FlowStepState;
        if (isException) {
            state = "offpath";
        } else if (index < currentIdx) {
            state = "past";
        } else if (index === currentIdx) {
            state = "current";
        } else {
            state = "future";
        }

        if (eventRecorded && state === "future") {
            state = "past";
        }

        if (step.id === "created" && status === "Created") {
            state = "current";
        }

        return { step, state, eventRecorded };
    });
}

export function exceptionStatusLabel(status: string): string | null {
    if (status === "Cancelled") {
        return "Envío cancelado";
    }
    if (status === "Returned") {
        return "Envío devuelto";
    }
    return null;
}

export function journeyRailStatusCaption(status: string): string {
    const exception = exceptionStatusLabel(status);
    if (exception) {
        return exception;
    }
    return statusLabel(status);
}
