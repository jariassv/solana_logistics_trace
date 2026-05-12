/**
 * Orden de etapas de envío alineado a `cat_shipment_status` (MVP).
 * Estados terminales especiales: Delivered, Returned, Cancelled.
 */

export type ShipmentLifecycleStage = {
    code: string;
    label: string;
};

/** Flujo principal (orden de negocio). */
export const SHIPMENT_MAIN_FLOW: ShipmentLifecycleStage[] = [
    { code: "Created", label: "Creado" },
    { code: "InTransit", label: "En tránsito" },
    { code: "AtHub", label: "En hub" },
    { code: "OutForDelivery", label: "En reparto" },
    { code: "Delivered", label: "Entregado" },
];

export function isTerminalShipmentStatus(status: string): boolean {
    return status === "Delivered" || status === "Returned" || status === "Cancelled";
}

/** Índice de la etapa actual en el flujo principal, o -1 si no aplica. */
export function mainFlowIndex(status: string): number {
    return SHIPMENT_MAIN_FLOW.findIndex((s) => s.code === status);
}

export type FlowStepState = "past" | "current" | "future" | "offpath";

/**
 * Estado visual de cada paso del rail respecto al `status` actual del envío.
 */
export function stepStateForStatus(shipmentStatus: string, stepCode: string): FlowStepState {
    if (shipmentStatus === "Cancelled" || shipmentStatus === "Returned") {
        return "offpath";
    }
    const cur = mainFlowIndex(shipmentStatus);
    const i = mainFlowIndex(stepCode);
    if (cur < 0 || i < 0) {
        return "offpath";
    }
    if (i < cur) {
        return "past";
    }
    if (i === cur) {
        return "current";
    }
    return "future";
}

export function shouldShowExceptionBadge(status: string): boolean {
    return status === "Cancelled" || status === "Returned";
}
