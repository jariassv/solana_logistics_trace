import type { PublicKey } from "@solana/web3.js";

import { shipmentPda } from "@/lib/solana/pdas";

export function shipmentPdaFromOnChainId(
    programId: PublicKey,
    onChainShipmentId: string,
): PublicKey | null {
    try {
        const id = BigInt(onChainShipmentId);
        const [pk] = shipmentPda(programId, id);
        return pk;
    } catch {
        return null;
    }
}
