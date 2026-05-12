/**
 * Vars públicas inlinadas en build (ver `.env.example` `NEXT_PUBLIC_*`).
 */
import { PublicKey } from "@solana/web3.js";

export function parseProgramPublicKey(programIdRaw: string | undefined): PublicKey | null {
    const id = programIdRaw?.trim() ?? "";
    if (!id) {
        return null;
    }
    try {
        return new PublicKey(id);
    } catch {
        return null;
    }
}

/** Origen HTTP del backend (p. ej. `http://127.0.0.1:8001`) a partir de `NEXT_PUBLIC_API_BASE_URL`. */
export function apiOriginFromApiBase(apiBaseUrl: string): string {
    const trimmed = apiBaseUrl.replace(/\/+$/, "");
    return trimmed.replace(/\/api\/v1\/?$/i, "") || trimmed;
}

export function getPublicConfig() {
    const programId = process.env.NEXT_PUBLIC_PROGRAM_ID ?? "";
    return {
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "localnet",
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899",
        programId,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
        /** null si falta cadena o no es una `PublicKey` válida */
        programPublicKey: parseProgramPublicKey(programId.trim() !== "" ? programId : undefined),
    } as const;
}
