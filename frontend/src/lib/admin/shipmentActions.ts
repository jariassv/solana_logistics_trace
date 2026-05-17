/**
 * Acciones de UI por envío según rol (PLAN §5).
 */

import { roleMayExecuteStep } from "@/lib/admin/processCapabilities";

export type ShipmentCardActionId = "view_detail" | "record_event";

export type ShipmentCardAction = {
    id: ShipmentCardActionId;
    label: string;
    enabled: boolean;
    reason?: string;
};

export function shipmentCardActions(params: {
    role: string | null;
    hasWallet: boolean;
    programActive: boolean;
    actorOnChain: boolean;
}): ShipmentCardAction[] {
    const { role, hasWallet, programActive, actorOnChain } = params;

    const canRecord = roleMayExecuteStep("record_checkpoint", role);
    const recordReason = !hasWallet
        ? "Conecte la wallet."
        : !programActive
          ? "Active el programa en la red."
          : !actorOnChain
            ? "Registre su actor primero."
            : !canRecord
              ? role === "Sender"
                  ? "El remitente no registra eventos logísticos."
                  : role === "Inspector"
                    ? "Rol de solo lectura."
                    : "Su rol no puede registrar eventos."
              : undefined;

    return [
        {
            id: "view_detail",
            label: "Ver detalle",
            enabled: hasWallet && programActive,
            reason:
                !hasWallet || !programActive
                    ? "Conecte la wallet y active el programa."
                    : undefined,
        },
        {
            id: "record_event",
            label: "Registrar evento",
            enabled: Boolean(canRecord && programActive && actorOnChain && hasWallet),
            reason: recordReason,
        },
    ];
}

export function statusBadgeClass(status: string): string {
    switch (status) {
        case "Delivered":
            return "badge badge--success";
        case "Cancelled":
            return "badge badge--danger";
        case "OutForDelivery":
            return "badge badge--info";
        default:
            return "badge badge--neutral";
    }
}
