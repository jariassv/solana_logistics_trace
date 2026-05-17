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

/** @deprecated Usar `canUseChainOperationsNav`. */
export const canUseOperationsDemoNav = canUseChainOperationsNav;

/** Solo remitentes crean envíos en el flujo actual del programa. */
export function canSenderRegisterShipments(role: string | null): boolean {
    return role === "Sender";
}

/** Carrier, Hub y Recipient registran checkpoints on-chain. */
export function canRecordCheckpoint(role: string | null): boolean {
    return role === "Carrier" || role === "Hub" || role === "Recipient";
}

/** Enlaces de envíos requieren wallet conectada (query `wallet` obligatoria en API). */
export function canOpenShipmentTracker(walletConnected: boolean): boolean {
    return walletConnected;
}
