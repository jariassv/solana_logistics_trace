/** URL del explorador Solana para una transacción (null si no hay enlace público útil). */
export function solanaExplorerTxUrl(signature: string, network: string): string | null {
    const sig = signature.trim();
    if (!sig || sig.startsWith("system:")) {
        return null;
    }
    const net = network.trim().toLowerCase();
    if (net === "localnet") {
        return null;
    }
    const encoded = encodeURIComponent(sig);
    const base = `https://explorer.solana.com/tx/${encoded}`;
    if (net === "devnet" || net === "testnet") {
        return `${base}?cluster=${net}`;
    }
    return base;
}
