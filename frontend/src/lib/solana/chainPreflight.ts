import type { Connection, PublicKey } from "@solana/web3.js";

import { actorPda } from "@/lib/solana/pdas";
import { fetchProgramConfig } from "@/lib/solana/program_config";

/** Comprueba requisitos on-chain antes de `record_checkpoint`. Devuelve mensaje de error o null si OK. */
export async function validateRecordCheckpointPreflight(
    connection: Connection,
    programId: PublicKey,
    authority: PublicKey,
    shipmentAccount: PublicKey,
    onChainShipmentId: string,
): Promise<string | null> {
    const cfg = await fetchProgramConfig(connection, programId);
    if (!cfg) {
        return "El programa no está activado en esta red. Use Consola → Activar programa.";
    }

    const [actorPk] = actorPda(programId, authority);
    const actorAcc = await connection.getAccountInfo(actorPk, "confirmed");
    if (!actorAcc?.data?.length) {
        return "Registre su actor en /registro con esta wallet antes de registrar eventos (la cuenta on-chain no existe).";
    }

    const shipmentAcc = await connection.getAccountInfo(shipmentAccount, "confirmed");
    if (!shipmentAcc?.data?.length) {
        return `El envío #${onChainShipmentId} no existe en la cadena actual. Si reinició el validador, los envíos del listado son solo históricos en base de datos: cree un envío nuevo on-chain.`;
    }
    if (!shipmentAcc.owner.equals(programId)) {
        return `La cuenta del envío #${onChainShipmentId} no pertenece al programa configurado. Revise NEXT_PUBLIC_PROGRAM_ID y la red en Phantom.`;
    }

    return null;
}
