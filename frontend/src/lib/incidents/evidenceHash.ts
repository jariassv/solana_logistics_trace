/**
 * SHA-256 del JSON de evidencia (alineado con hash on-chain).
 */

export async function sha256EvidenceJson(evidence: Record<string, unknown>): Promise<Uint8Array> {
    const canonical = JSON.stringify(evidence);
    const data = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(digest);
}

export function evidenceHashToHex(hash: Uint8Array): string {
    return Array.from(hash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
