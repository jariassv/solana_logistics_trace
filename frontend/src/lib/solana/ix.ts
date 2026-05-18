/**
 * Anchor-like discriminadores `sha256(global:<name>)` (primeros 8 bytes).
 * Deben coincidir con backend `crate::solana::discriminators` y programa Anchor.
 */
import { Buffer } from "buffer";

export const IX_INITIALIZE = Buffer.from("afaf6d1f0d989bed", "hex");
export const IX_REGISTER_ACTOR = Buffer.from("7119c49c5c4f0f97", "hex");
export const IX_CREATE_SHIPMENT = Buffer.from("434011721e8ff9f7", "hex");
export const IX_RECORD_CHECKPOINT = Buffer.from("f79c995c349aa7db", "hex");
export const IX_REPORT_CRITICAL_INCIDENT = Buffer.from("4b90610ef4568f97", "hex");

/** discriminador cuenta Anchor `ProgramConfig`. */
export const ACCOUNT_PROGRAM_CONFIG = Buffer.from("c4d25ae790958c3f", "hex");

/** Índices Borsh de `ActorRole` en orden del programa. */
export enum ActorRoleCode {
    Sender = 0,
    Carrier,
    Hub,
    Recipient,
    Inspector,
}

/** Índices Borsh de `CheckpointType` en orden del programa. */
export enum CheckpointTypeCode {
    Pickup = 0,
    HubIn,
    HubOut,
    Transit,
    DeliveryAttempt,
    Delivered,
    SensorData,
}

function encodeBorshString(s: string): Buffer {
    const encoded = Buffer.from(new TextEncoder().encode(s));
    const len = Buffer.alloc(4);
    len.writeUInt32LE(encoded.length, 0);
    return Buffer.concat([len, encoded]);
}

function encodeOptionI32(value: number | null): Buffer {
    if (value === null || value === undefined) {
        return Buffer.from([0]);
    }
    const b = Buffer.alloc(5);
    b.writeUInt8(1, 0);
    b.writeInt32LE(value, 1);
    return b;
}

function encodeOptionI16(value: number | null): Buffer {
    if (value === null || value === undefined) {
        return Buffer.from([0]);
    }
    const b = Buffer.alloc(3);
    b.writeUInt8(1, 0);
    b.writeInt16LE(value, 1);
    return b;
}

function encodeOptionU8(value: number | null): Buffer {
    if (value === null || value === undefined) {
        return Buffer.from([0]);
    }
    return Buffer.from([1, value & 0xff]);
}

/** Cuerpo de instrucción `register_actor`. */
export function encodeRegisterActorData(
    role: ActorRoleCode,
    name: string,
    location: string,
): Buffer {
    return Buffer.concat([
        IX_REGISTER_ACTOR,
        Buffer.from([role]),
        encodeBorshString(name),
        encodeBorshString(location ?? ""),
    ]);
}

/** Cuerpo de instrucción `create_shipment`. */
export function encodeCreateShipmentData(
    product: string,
    origin: string,
    destination: string,
    requiresColdChain: boolean,
): Buffer {
    return Buffer.concat([
        IX_CREATE_SHIPMENT,
        encodeBorshString(product),
        encodeBorshString(origin),
        encodeBorshString(destination),
        Buffer.from([requiresColdChain ? 1 : 0]),
    ]);
}

/** Cuerpo de instrucción `record_checkpoint`. */
export function encodeRecordCheckpointData(
    checkpointType: CheckpointTypeCode,
    location: string,
    latitude: number | null,
    longitude: number | null,
    temperature: number | null,
    humidity: number | null,
    metadata: string,
): Buffer {
    return Buffer.concat([
        IX_RECORD_CHECKPOINT,
        Buffer.from([checkpointType]),
        encodeBorshString(location),
        encodeOptionI32(latitude ?? null),
        encodeOptionI32(longitude ?? null),
        encodeOptionI16(temperature ?? null),
        encodeOptionU8(humidity ?? null),
        encodeBorshString(metadata),
    ]);
}

/** Índices Borsh de `CriticalIncidentType` (Anchor). */
export enum CriticalIncidentTypeCode {
    TempViolation = 0,
    Damage,
    Delay,
    Lost,
    Unauthorized,
    Other,
}

/** Índices Borsh de `OnChainIncidentSeverity`. */
export enum OnChainIncidentSeverityCode {
    High = 0,
    Critical,
}

/** Solo discriminador para `initialize` (sin args). */
export function encodeInitializeData(): Buffer {
    return Buffer.from(IX_INITIALIZE);
}

/** Cuerpo de instrucción `report_critical_incident`. */
export function encodeReportCriticalIncidentData(
    incidentType: CriticalIncidentTypeCode,
    severity: OnChainIncidentSeverityCode,
    evidenceHash: Uint8Array,
    description: string,
): Buffer {
    if (evidenceHash.length !== 32) {
        throw new Error("evidenceHash must be 32 bytes");
    }
    return Buffer.concat([
        IX_REPORT_CRITICAL_INCIDENT,
        Buffer.from([incidentType]),
        Buffer.from([severity]),
        Buffer.from(evidenceHash),
        encodeBorshString(description),
    ]);
}
