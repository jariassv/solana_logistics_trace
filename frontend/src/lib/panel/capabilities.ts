/**
 * Reglas de UI por rol de actor (Etapa 2 — PLAN §5).
 * El backend es la fuente de verdad del rol (`GET /actors/me`).
 */

export const ACTOR_ROLES = ["Sender", "Carrier", "Hub", "Recipient", "Inspector"] as const;

export type ActorRoleCode = (typeof ACTOR_ROLES)[number];

export function isKnownActorRole(role: string | null): role is ActorRoleCode {
    return role !== null && (ACTOR_ROLES as readonly string[]).includes(role);
}

/** Inspector: solo lectura; sin flujo de firma en el panel técnico. */
export function canAccessOnChainOperationsPanel(role: string | null): boolean {
    if (role === null) {
        return true;
    }
    return role !== "Inspector";
}

/** Operaciones on-chain (firma): wallet conectada y rol distinto de Inspector. */
export function canUseChainOperationsNav(walletConnected: boolean, role: string | null): boolean {
    return walletConnected && canAccessOnChainOperationsPanel(role);
}

/** Solo remitentes crean envíos en el flujo actual del programa. */
export function canSenderRegisterShipments(role: string | null): boolean {
    return role === "Sender";
}

/** Reporte crítico on-chain: participantes del envío (MVP). */
export function canReportCriticalIncident(role: string | null): boolean {
    return role === "Sender" || role === "Carrier" || role === "Recipient";
}

/** Cierre operativo off-chain: participantes y roles operativos (no Inspector). */
export function canResolveIncident(role: string | null): boolean {
    if (role === "Inspector") {
        return false;
    }
    return role !== null;
}

/** Carrier, Hub y Recipient registran checkpoints on-chain. */
export function canRecordCheckpoint(role: string | null): boolean {
    return role === "Carrier" || role === "Hub" || role === "Recipient";
}

/** Códigos de checkpoint que cada rol debería usar en el MVP (guía UI; Anchor no restringe por rol). */
export function checkpointTypeCodesForRole(role: string | null): readonly string[] | null {
    switch (role) {
        case "Carrier":
            return ["Pickup", "Transit", "HubIn", "HubOut", "SensorData"];
        case "Hub":
            return ["HubIn", "HubOut", "SensorData"];
        case "Recipient":
            return ["DeliveryAttempt", "Delivered", "SensorData"];
        default:
            return null;
    }
}

export function recordCheckpointRoleHint(role: string | null): string {
    switch (role) {
        case "Carrier":
            return "Como transportista registra recogida, tránsito y paso por hub. No use entrega final (eso corresponde al destinatario).";
        case "Hub":
            return "Como hub registre entrada y salida del nodo y lecturas de sensor si aplica.";
        case "Recipient":
            return "Como destinatario registre intento o confirmación de entrega.";
        default:
            return "Registre un evento logístico firmando con su actor en esta red.";
    }
}

/** Carrier, Hub e Inspector ven el inventario operativo completo en el API (§8.2). */
export function seesOperationalShipmentInventory(role: string | null): boolean {
    return role === "Carrier" || role === "Hub" || role === "Inspector";
}

/** Enlaces de envíos requieren wallet conectada (query `wallet` obligatoria en API). */
export function canOpenShipmentTracker(walletConnected: boolean): boolean {
    return walletConnected;
}

export function roleDisplayName(role: string | null): string {
    if (!role) {
        return "Sin rol en backend";
    }
    return role;
}
