/**
 * Acciones de UI por envío según rol (PLAN §5).
 */

import {
    canRecordCheckpoint,
    canSenderRegisterShipments,
    carrierIsAssignedToShipment,
    shipmentAcceptsNewCheckpoints,
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
    shipmentStatus?: string;
    carrierWallet?: string | null;
    viewerWallet?: string | null;
}): { enabled: boolean; reason?: string } {
    const {
        role,
        hasWallet,
        programConfigured,
        actorOnChain,
        actorLoading,
        shipmentStatus,
        carrierWallet,
        viewerWallet,
    } = params;

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
        if (role) {
            return {
                enabled: false,
                reason:
                    "Su actor está en el backend pero no en la cadena (p. ej. tras reiniciar el validador). Vuelva a /registro con la misma wallet y sincronice.",
            };
        }
        return { enabled: false, reason: "Registre su actor en la página de registro." };
    }
    if (actorOnChain === null && !actorLoading) {
        return {
            enabled: false,
            reason: "No se pudo verificar el actor en cadena. Compruebe la red RPC y recargue la página.",
        };
    }
    if (shipmentStatus && !shipmentAcceptsNewCheckpoints(shipmentStatus)) {
        return {
            enabled: false,
            reason: "El envío ya está entregado o cerrado; no se pueden registrar nuevos eventos.",
        };
    }
    if (
        role === "Carrier" &&
        carrierWallet !== undefined &&
        viewerWallet !== undefined &&
        !carrierIsAssignedToShipment(role, carrierWallet, viewerWallet)
    ) {
        return {
            enabled: false,
            reason: "Solo puede registrar eventos en envíos asignados a usted como transportista.",
        };
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
    programConfigured: boolean;
    programActive: boolean;
    actorOnChain: boolean | null;
    actorLoading?: boolean;
}): { enabled: boolean; reason?: string } {
    const { role, hasWallet, programConfigured, programActive, actorOnChain, actorLoading } = params;

    if (actorLoading) {
        return { enabled: false, reason: "Cargando perfil…" };
    }
    if (!hasWallet) {
        return { enabled: false, reason: "Conecte la wallet." };
    }
    if (!programConfigured) {
        return { enabled: false, reason: "El programa no está configurado en el despliegue." };
    }
    if (!programActive) {
        return {
            enabled: false,
            reason: "El programa no está activo en esta red. Use Consola → Activar programa.",
        };
    }
    if (!canSenderRegisterShipments(role)) {
        if (role === null) {
            return {
                enabled: false,
                reason: "Registre su actor en /registro con rol Sender y sincronice con el backend.",
            };
        }
        return { enabled: false, reason: "Solo el rol Sender puede registrar envíos." };
    }
    if (actorOnChain === false) {
        return {
            enabled: false,
            reason:
                "Su actor Sender está en el backend pero no en la cadena (p. ej. tras reiniciar el validador). Vuelva a /registro con la misma wallet y sincronice.",
        };
    }
    if (actorOnChain === null) {
        return {
            enabled: false,
            reason: "No se pudo verificar el actor en cadena. Compruebe la red RPC y recargue la página.",
        };
    }
    return { enabled: true };
}
