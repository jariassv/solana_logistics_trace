/**
 * Acciones de UI por envío según rol (PLAN §5).
 */

import {
    canRecordCheckpoint,
    canSenderRegisterShipments,
} from "@/lib/panel/capabilities";

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

    const canRecord = canRecordCheckpoint(role);
    const recordReason = !hasWallet
        ? "Conecte la wallet."
        : !programActive
          ? "El programa no está activo en esta red."
          : !actorOnChain
            ? "Registre su actor en la página de registro."
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
            enabled: hasWallet,
            reason: !hasWallet ? "Conecte la wallet." : undefined,
        },
        {
            id: "record_event",
            label: "Registrar evento",
            enabled: Boolean(canRecord && programActive && actorOnChain && hasWallet),
            reason: recordReason,
        },
    ];
}

export function canCreateShipmentAction(params: {
    role: string | null;
    hasWallet: boolean;
    programActive: boolean;
    actorOnChain: boolean;
}): { enabled: boolean; reason?: string } {
    const { role, hasWallet, programActive, actorOnChain } = params;
    if (!hasWallet) {
        return { enabled: false, reason: "Conecte la wallet." };
    }
    if (!programActive) {
        return { enabled: false, reason: "El programa no está activo en esta red." };
    }
    if (!actorOnChain) {
        return { enabled: false, reason: "Registre su actor en la página de registro." };
    }
    if (!canSenderRegisterShipments(role)) {
        return { enabled: false, reason: "Solo el rol Sender puede registrar envíos." };
    }
    return { enabled: true };
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
