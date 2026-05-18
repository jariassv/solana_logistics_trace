import type { AccountMeta, PublicKey } from "@solana/web3.js";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";

import type { ActorRoleCode, CheckpointTypeCode } from "./ix";
import {
    encodeCreateShipmentData,
    encodeInitializeData,
    encodeRecordCheckpointData,
    encodeRegisterActorData,
    encodeReportCriticalIncidentData,
    type CriticalIncidentTypeCode,
    type OnChainIncidentSeverityCode,
} from "./ix";
import { actorPda, checkpointPda, configPda, shipmentPda } from "./pdas";

export type BuildInitializeParams = {
    programId: PublicKey;
    authority: PublicKey;
};

export type BuildRegisterActorParams = {
    programId: PublicKey;
    authority: PublicKey;
    role: ActorRoleCode;
    name: string;
    location: string;
};

export type BuildCreateShipmentParams = {
    programId: PublicKey;
    sender: PublicKey;
    recipient: PublicKey;
    /** Próximo id de envío = `program_config.shipments_created + 1` antes de ejecutar la tx */
    nextShipmentIndex: bigint;
    product: string;
    origin: string;
    destination: string;
    requiresColdChain: boolean;
};

export type BuildReportCriticalIncidentParams = {
    programId: PublicKey;
    reporter: PublicKey;
    shipment: PublicKey;
    incidentType: CriticalIncidentTypeCode;
    severity: OnChainIncidentSeverityCode;
    evidenceHash: Uint8Array;
    description: string;
};

export type BuildRecordCheckpointParams = {
    programId: PublicKey;
    authority: PublicKey;
    shipment: PublicKey;
    /** Próximo id checkpoint = program_config.checkpoints_recorded + 1 antes de la tx */
    nextCheckpointIndex: bigint;
    checkpointType: CheckpointTypeCode;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    metadata: string;
};

export function createInitializeIx(p: BuildInitializeParams): TransactionInstruction {
    const [programConfig] = configPda(p.programId);
    const keys: AccountMeta[] = [
        { pubkey: p.authority, isSigner: true, isWritable: true },
        { pubkey: programConfig, isSigner: false, isWritable: true },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        programId: p.programId,
        keys,
        data: encodeInitializeData(),
    });
}

export function createRegisterActorIx(p: BuildRegisterActorParams): TransactionInstruction {
    const [programConfig] = configPda(p.programId);
    const [actorAccount] = actorPda(p.programId, p.authority);
    const keys: AccountMeta[] = [
        { pubkey: p.authority, isSigner: true, isWritable: true },
        { pubkey: programConfig, isSigner: false, isWritable: true },
        { pubkey: actorAccount, isSigner: false, isWritable: true },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        programId: p.programId,
        keys,
        data: encodeRegisterActorData(p.role, p.name, p.location),
    });
}

export function createCreateShipmentIx(p: BuildCreateShipmentParams): TransactionInstruction {
    const [programConfig] = configPda(p.programId);
    const [senderActor] = actorPda(p.programId, p.sender);
    const [shipmentAccount] = shipmentPda(p.programId, p.nextShipmentIndex);
    const keys: AccountMeta[] = [
        { pubkey: p.sender, isSigner: true, isWritable: true },
        { pubkey: senderActor, isSigner: false, isWritable: true },
        { pubkey: programConfig, isSigner: false, isWritable: true },
        { pubkey: p.recipient, isSigner: false, isWritable: false },
        { pubkey: shipmentAccount, isSigner: false, isWritable: true },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        programId: p.programId,
        keys,
        data: encodeCreateShipmentData(
            p.product,
            p.origin,
            p.destination,
            p.requiresColdChain,
        ),
    });
}

export function createRecordCheckpointIx(p: BuildRecordCheckpointParams): TransactionInstruction {
    const [programConfig] = configPda(p.programId);
    const [actorAccount] = actorPda(p.programId, p.authority);
    const [checkpointAccount] = checkpointPda(p.programId, p.shipment, p.nextCheckpointIndex);
    const keys: AccountMeta[] = [
        { pubkey: p.authority, isSigner: true, isWritable: true },
        { pubkey: actorAccount, isSigner: false, isWritable: true },
        { pubkey: programConfig, isSigner: false, isWritable: true },
        { pubkey: p.shipment, isSigner: false, isWritable: true },
        { pubkey: checkpointAccount, isSigner: false, isWritable: true },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        programId: p.programId,
        keys,
        data: encodeRecordCheckpointData(
            p.checkpointType,
            p.location,
            p.latitude ?? null,
            p.longitude ?? null,
            p.temperature ?? null,
            p.humidity ?? null,
            p.metadata,
        ),
    });
}

export function createReportCriticalIncidentIx(
    p: BuildReportCriticalIncidentParams,
): TransactionInstruction {
    const [programConfig] = configPda(p.programId);
    const [reporterActor] = actorPda(p.programId, p.reporter);
    const keys: AccountMeta[] = [
        { pubkey: p.reporter, isSigner: true, isWritable: true },
        { pubkey: reporterActor, isSigner: false, isWritable: false },
        { pubkey: programConfig, isSigner: false, isWritable: true },
        { pubkey: p.shipment, isSigner: false, isWritable: true },
    ];
    return new TransactionInstruction({
        programId: p.programId,
        keys,
        data: encodeReportCriticalIncidentData(
            p.incidentType,
            p.severity,
            p.evidenceHash,
            p.description,
        ),
    });
}
