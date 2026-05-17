/**
 * Acciones de UI por envío según rol (PLAN §5).
 */

import {
    canRecordCheckpoint,
    canSenderRegisterShipments,
} from "@/lib/panel/capabilities";
import { statusBadgeClass } from "@/lib/shipments/display";

export { statusBadgeClass };

export type ShipmentCardActionId = "view_detail" | "record_event";

export type ShipmentCardAction = {
    id: ShipmentCardActionId;
    label: string;
    enabled: boolean;
    reason?: string;
};

export function canRecordCheckpointAction(params: {
    role: string | null;
    hasWallet: boolean;
    programConfigured: boolean;
    actorOnChain: boolean | null;
    actorLoading?: boolean;
}): { enabled: boolean; reason?: string } {
    const { role, hasWallet, programConfigured, actorOnChain, actorLoading } = params;

    if (actorLoading) {
        return { enabled: false, reason: "Cargando perfil…" };
    }
    if (!hasWallet) {
        return { enabled: false, reason: "Conecte la wallet." };
    }
    if (!programConfigured) {
        return { enabled: false, reason: "El programa no está configurado en el despliegue." };
    }
    if (!canRecordCheckpoint(role)) {
        if (role === "Sender") {
            return { enabled: false, reason: "El remitente no registra eventos logísticos." };
        }
        if (role === "Inspector") {
            return { enabled: false, reason: "Rol de solo lectura." };
        }
        return { enabled: false, reason: "Su rol no puede registrar eventos." };
    }
    if (actorOnChain === false) {
        return { enabled: false, reason: "Registre su actor en la página de registro." };
    }
    return { enabled: true };
}

export function shipmentCardActions(params: {
    role: string | null;
    hasWallet: boolean;
    programConfigured: boolean;
    actorOnChain: boolean | null;
    actorLoading?: boolean;
}): ShipmentCardAction[] {
    const recordGate = canRecordCheckpointAction(params);

    return [
        {
            id: "view_detail",
            label: "Ver detalle",
            enabled: params.hasWallet,
            reason: !params.hasWallet ? "Conecte la wallet." : undefined,
        },
        {
            id: "record_event",
            label: "Registrar evento",
            enabled: recordGate.enabled,
            reason: recordGate.reason,
        },
    ];
}

export function canCreateShipmentAction(params: {
    role: string | null;
    hasWallet: boolean;
    programActive: boolean;
    actorOnChain: boolean | null;
}): { enabled: boolean; reason?: string } {
    const { role, hasWallet, programActive, actorOnChain } = params;
    if (!hasWallet) {
        return { enabled: false, reason: "Conecte la wallet." };
    }
    if (!programActive) {
        return { enabled: false, reason: "El programa no está activo en esta red." };
    }
    if (actorOnChain === false) {
        return { enabled: false, reason: "Registre su actor en la página de registro." };
    }
    if (!canSenderRegisterShipments(role)) {
        return { enabled: false, reason: "Solo el rol Sender puede registrar envíos." };
    }
    return { enabled: true };
}
