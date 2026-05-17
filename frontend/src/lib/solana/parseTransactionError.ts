/**
 * Extrae texto útil de errores de `sendRawTransaction` / `simulateTransaction` (web3.js).
 */

export function extractTransactionErrorText(err: unknown): string {
    if (!(err instanceof Error)) {
        return String(err);
    }
    const extra = err as Error & { logs?: string[]; err?: unknown };
    const chunks: string[] = [err.message];
    if (Array.isArray(extra.logs) && extra.logs.length > 0) {
        chunks.push(extra.logs.join("\n"));
    }
    if (extra.err !== undefined) {
        chunks.push(typeof extra.err === "string" ? extra.err : JSON.stringify(extra.err));
    }
    return chunks.filter(Boolean).join("\n");
}

/** Mensaje orientado al usuario a partir del error crudo de la red. */
export function userMessageFromTransactionError(raw: string): string | null {
    const m = raw;
    const lower = m.toLowerCase();

    if (
        lower.includes("already in use") ||
        lower.includes("accountalreadyinuse") ||
        lower.includes("account already in use")
    ) {
        return "Esta cartera ya tiene un actor registrado en esta red (cuenta PDA existente).";
    }
    if (
        lower.includes("insufficient lamports") ||
        lower.includes("insufficient funds") ||
        lower.includes("attempt to debit an account but found no record")
    ) {
        return "La wallet no tiene SOL suficiente para pagar la renta de la cuenta. En localnet use un airdrop (solana airdrop 2 <wallet>).";
    }
    if (lower.includes("blockhash not found") || lower.includes("block height exceeded")) {
        return "La transacción expiró. Recargue la página e inténtelo de nuevo.";
    }
    if (lower.includes("invalidactorname") || lower.includes("0x1771")) {
        return "El nombre del actor no es válido (vacío o demasiado largo).";
    }
    if (lower.includes("locationtoolong") || lower.includes("0x1772")) {
        return "La ubicación supera el tamaño máximo permitido.";
    }
    if (
        lower.includes("incorrect program id") ||
        lower.includes("invalid program id")
    ) {
        return "El programa configurado no coincide con esta red. Revise NEXT_PUBLIC_PROGRAM_ID y la red en Phantom.";
    }
    if (lower.includes("simulation failed")) {
        if (lower.includes("accountnotinitialized") && lower.includes("program_config")) {
            return "El programa no está activado en esta red. Ejecute primero «Activar programa» en Consola.";
        }
        if (
            (lower.includes("accountnotinitialized") || lower.includes("account not initialized")) &&
            (lower.includes("actor") || lower.includes("account: actor"))
        ) {
            return "Registre su actor en /registro con esta wallet antes de registrar eventos.";
        }
        if (
            lower.includes("accountnotinitialized") ||
            lower.includes("account not initialized") ||
            lower.includes("could not find account") ||
            (lower.includes("account: shipment") && lower.includes("shipment"))
        ) {
            if (lower.includes("shipment") || lower.includes("checkpoint")) {
                return "El envío no existe en esta cadena (p. ej. tras reiniciar el validador). Cree un envío nuevo on-chain o vuelva a sincronizar.";
            }
        }
        if (lower.includes("accountownedbywrongprogram") || lower.includes("owned by a different program")) {
            return "Una cuenta de la transacción no pertenece al programa esperado. Revise PROGRAM_ID y la red en Phantom.";
        }
        if (lower.includes("already in use") && lower.includes("checkpoint")) {
            return "El índice de evento ya existe en cadena. Recargue la página e inténtelo de nuevo.";
        }
        return "La simulación de la transacción falló. Compruebe red Phantom, SOL, que el programa esté activo y que el envío exista on-chain.";
    }
    if (lower.includes("user rejected") || lower.includes("rejected the request")) {
        return "Operación cancelada en la billetera.";
    }
    if (lower.includes("network mismatch") || lower.includes("wrong network")) {
        return "La red de Phantom no coincide con la configurada en la aplicación (localnet/devnet).";
    }

    return null;
}
