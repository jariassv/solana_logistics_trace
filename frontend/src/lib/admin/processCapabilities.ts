/**
 * Pasos del proceso operativo y permisos por rol (PLAN §5 — UI refleja Anchor).
 */

import type { ActorRoleCode } from "@/lib/panel/capabilities";
import { isKnownActorRole } from "@/lib/panel/capabilities";

export type AdminProcessStep =
    | "initialize"
    | "register_actor"
    | "create_shipment"
    | "record_checkpoint";

export type AdminProcessContext = {
    walletConnected: boolean;
    programConfigured: boolean;
    programActive: boolean;
    actorOnChain: boolean;
    actorInBackend: boolean;
    selectedShipmentId: string | null;
    hasShipments: boolean;
    role: string | null;
};

export type StepVisualStatus = "done" | "available" | "locked";

const STEP_LABELS: Record<AdminProcessStep, string> = {
    initialize: "Activación del programa",
    register_actor: "Alta de actor",
    create_shipment: "Registro de envío",
    record_checkpoint: "Evento logístico",
};

export function adminStepLabel(step: AdminProcessStep): string {
    return STEP_LABELS[step];
}

/** ¿Este rol puede firmar esta operación on-chain? */
export function roleMayExecuteStep(step: AdminProcessStep, role: string | null): boolean {
    if (role === "Inspector") {
        return false;
    }
    switch (step) {
        case "initialize":
            return true;
        case "register_actor":
            if (role === "Inspector") {
                return false;
            }
            return true;
        case "create_shipment":
            if (role === "Inspector") {
                return false;
            }
            return role === "Sender" || role === null;
        case "record_checkpoint":
            return (
                role === "Carrier" ||
                role === "Hub" ||
                role === "Recipient"
            );
        default:
            return false;
    }
}

export function stepVisualStatus(
    step: AdminProcessStep,
    ctx: AdminProcessContext,
): StepVisualStatus {
    if (step === "initialize") {
        return ctx.programActive ? "done" : ctx.walletConnected && ctx.programConfigured ? "available" : "locked";
    }
    if (!ctx.programActive) {
        return "locked";
    }
    if (step === "register_actor") {
        if (ctx.actorOnChain && ctx.actorInBackend) {
            return "done";
        }
        if (ctx.actorOnChain) {
            return "done";
        }
        return ctx.walletConnected ? "available" : "locked";
    }
    if (!ctx.actorOnChain) {
        return "locked";
    }
    if (step === "create_shipment") {
        if (!roleMayExecuteStep(step, ctx.role)) {
            return "locked";
        }
        return "available";
    }
    if (step === "record_checkpoint") {
        if (!roleMayExecuteStep(step, ctx.role)) {
            return "locked";
        }
        if (!ctx.hasShipments) {
            return "locked";
        }
        if (!ctx.selectedShipmentId) {
            return "locked";
        }
        return "available";
    }
    return "locked";
}

export function stepLockReason(step: AdminProcessStep, ctx: AdminProcessContext): string | null {
    if (!ctx.walletConnected) {
        return "Conecte la wallet con Phantom en el encabezado.";
    }
    if (!ctx.programConfigured) {
        return "El programa de trazabilidad no está configurado en el despliegue.";
    }
    if (step !== "initialize" && !ctx.programActive) {
        return "Complete primero la activación del programa en la red.";
    }
    if (step === "register_actor" && ctx.actorOnChain) {
        return "El actor ya está registrado para esta cartera.";
    }
    if ((step === "create_shipment" || step === "record_checkpoint") && !ctx.actorOnChain) {
        return "Registre el actor antes de continuar.";
    }
    if (step === "create_shipment") {
        if (!roleMayExecuteStep(step, ctx.role)) {
            if (ctx.role === null) {
                return "Su rol aún no está disponible en el backend.";
            }
            if (isKnownActorRole(ctx.role)) {
                return `El rol ${ctx.role} no puede crear envíos.`;
            }
            return "Su rol no tiene permiso para crear envíos.";
        }
    }
    if (step === "record_checkpoint") {
        if (!roleMayExecuteStep(step, ctx.role)) {
            if (ctx.role === "Inspector") {
                return "El rol Inspector es de solo lectura.";
            }
            if (ctx.role === "Sender") {
                return "El remitente no registra eventos logísticos en este flujo.";
            }
            if (ctx.role === null) {
                return "Espere a que el backend confirme su rol.";
            }
            return "Su rol no puede registrar eventos logísticos.";
        }
        if (!ctx.hasShipments) {
            return "No hay envíos asociados a su cartera. Registre un envío antes (remitente).";
        }
        if (!ctx.selectedShipmentId) {
            return "Seleccione un envío en las tarjetas de arriba.";
        }
    }
    if (step === "initialize" && ctx.programActive) {
        return "El programa ya está activo en esta red.";
    }
    return null;
}

export function roleDisplayName(role: string | null): string {
    if (!role) {
        return "Sin rol en backend";
    }
    return role;
}

export type { ActorRoleCode };
