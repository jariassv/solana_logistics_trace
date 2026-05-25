/** Visibilidad de Consola según activación del programa y wallet autoridad. */

export type ConsolaAccessInput = {
    wallet: string | null;
    programActive: boolean;
    programAuthority: string | null;
};

/**
 * Consola visible si hay wallet conectada y:
 * - el programa no está activo (cualquier cuenta puede activarlo), o
 * - el programa está activo y la wallet es la autoridad que lo inicializó.
 */
export function canAccessConsola({
    wallet,
    programActive,
    programAuthority,
}: ConsolaAccessInput): boolean {
    if (!wallet) {
        return false;
    }
    if (!programActive) {
        return true;
    }
    if (!programAuthority) {
        return false;
    }
    return wallet === programAuthority;
}
