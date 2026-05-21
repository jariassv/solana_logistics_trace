/**
 * Textos de negocio para el panel Etapa 1 (sin detalles técnicos para el usuario final).
 */

import { PublicKey } from "@solana/web3.js";

import type { BackendHealthResult } from "@/lib/api/backendConnectivity";
import {
    extractTransactionErrorText,
    userMessageFromTransactionError,
} from "@/lib/solana/parseTransactionError";

/** Validación del campo destinatario (clave pública). */
export function recipientFieldValidationError(recipientTrimmed: string): string | null {
    if (!recipientTrimmed) {
        return "Indique la clave pública del destinatario.";
    }
    try {
        const rec = new PublicKey(recipientTrimmed);
        if (rec.equals(PublicKey.default)) {
            return "La cuenta indicada no es válida como destinatario.";
        }
        return null;
    } catch {
        return "La clave pública del destinatario no es válida.";
    }
}

export function extractApiErrorMessage(json: unknown): string | null {
    if (json && typeof json === "object" && "error" in json) {
        const e = (json as { error: unknown }).error;
        if (typeof e === "string" && e.trim()) {
            return e.trim();
        }
    }
    return null;
}

function mapBackendErrorPhrase(api: string): string | null {
    const lower = api.toLowerCase();
    if (lower.includes("decode") || lower.includes("on-chain account")) {
        return "El servidor no pudo interpretar los datos de la operación. Si persiste, contacte con soporte.";
    }
    if (lower.includes("wrong program") || lower.includes("wrong instruction")) {
        return "La operación no corresponde al programa configurado en el servidor.";
    }
    if (lower.includes("not configured") || lower.includes("503")) {
        return "El servidor de datos no tiene el programa configurado.";
    }
    return null;
}

export function userMessageForSyncFailure(
    entityLabel: string,
    status: number,
    json: unknown,
): string {
    const api = extractApiErrorMessage(json);
    if (api) {
        const mapped = mapBackendErrorPhrase(api);
        if (mapped) {
            return mapped;
        }
    }
    if (status === 409 && api) {
        const lower = api.toLowerCase();
        if (lower.includes("different transaction")) {
            return `El actor ya existía en el backend con otra transacción. Si reinició el validador, vuelva a registrar en cadena y sincronice de nuevo (el servidor actualizará el registro).`;
        }
    }
    if (status === 422) {
        return `Los datos de ${entityLabel} no pudieron validarse. Revise la operación e inténtelo de nuevo.`;
    }
    if (status === 503) {
        return "El servicio de datos no está disponible temporalmente.";
    }
    if (status === 0) {
        return "No hubo respuesta del servidor de datos. Compruebe la red.";
    }
    return `No se pudo completar la replicación de ${entityLabel}. Inténtelo de nuevo.`;
}

export type ChainStepKey =
    | "initialize"
    | "register_actor"
    | "create_shipment"
    | "record_checkpoint"
    | "report_critical_incident";

/** Textos de ayuda junto a botones (panel administrativo). */
export const adminHints = {
    programNotConfigured: "Configure el identificador del programa en el entorno desplegado.",
    walletConnect: "Conecte la billetera firmante.",
    waitBusy: "Espere a que termine la operación en curso.",
    apiReplicationOff:
        "La replicación al sistema central está desactivada: falta la URL del servicio de datos.",
    apiUrlMalformed:
        "La URL del servicio debe incluir la ruta del API de datos (sufijo /api/v1) sin barra final.",
    programAlreadyActive: "El programa ya está activo en esta red.",
    runInitializeFirst: "Ejecute primero la activación del programa y espere a que cargue el estado.",
    recipientInvalid: "Revise la clave pública del destinatario.",
    shipmentPdaMissing: "Registre antes un envío para poder añadir eventos logísticos.",
} as const;

export function userFacingChainError(step: ChainStepKey, rawMessageOrError: string | unknown): string {
    const rawMessage =
        typeof rawMessageOrError === "string"
            ? rawMessageOrError
            : extractTransactionErrorText(rawMessageOrError);
    const txHint = userMessageFromTransactionError(rawMessage);
    if (txHint) {
        return txHint;
    }
    const m = rawMessage;
    if (step === "register_actor" && m.includes("already in use")) {
        return "Esta cartera ya tiene un actor registrado. Continúe con el registro de envíos o utilice otra cartera.";
    }
    if (step === "register_actor" && (m.includes("Actor ya registrado") || m.includes("ya registrado"))) {
        return "Esta cartera ya tiene un actor registrado. Continúe con el registro de envíos o utilice otra cartera.";
    }
    if (m.includes("Wallet") && m.includes("no listo")) {
        return "Conecte la billetera firmante e inténtelo de nuevo.";
    }
    if (m.includes("Programa no activo") || m.includes("ProgramConfig")) {
        return "El programa no está desplegado o inicializado en esta red. Use Consola → Activar programa.";
    }
    if (
        step === "record_checkpoint" &&
        (m.includes("AccountNotInitialized") ||
            m.includes("actor") ||
            /account.*not.*initialized/i.test(m))
    ) {
        return "Registre su actor en /registro con esta wallet antes de registrar eventos.";
    }
    if (
        m.includes("AccountNotInitialized") ||
        m.includes("sender_actor") ||
        m.includes("0xbc4") ||
        /account.*not.*initialized/i.test(m)
    ) {
        return "Registre su actor como remitente (Sender) en esta red antes de crear envíos.";
    }
    if (m.includes("Usuario rechazó") || m.includes("rejected") || m.includes("cancelled")) {
        return "Operación cancelada en la billetera.";
    }
    if (m.includes("Latitud") || m.includes("Longitud")) {
        return "Revise las coordenadas indicadas.";
    }
    if (m.includes("Humedad")) {
        return "Revise el valor de humedad indicado.";
    }
    if (m.includes("Temperatura")) {
        return "Revise el valor de temperatura.";
    }
    if (m.includes("PublicKey") || m.includes("destinatario")) {
        return m;
    }
    const detail = rawMessage.replace(/\s+/g, " ").trim().slice(0, 200);
    if (detail) {
        return `No se pudo completar la operación. Detalle: ${detail}`;
    }
    return "No se pudo completar la operación. Revise los datos e inténtelo de nuevo.";
}

export const syncSuccessCopy = {
    actor: "Actor registrado y replicado en el sistema central.",
    shipment: "Envío registrado y replicado en el sistema central.",
    checkpoint: "Evento logístico registrado y replicado en el sistema central.",
} as const;

export function healthProbeUserMessage(
    result: BackendHealthResult,
): { ok: boolean; text: string } {
    if (result.ok) {
        const db = result.database?.toLowerCase() ?? "";
        const dbOk = db.includes("ok") || db.includes("up") || db.includes("connect");
        const suffix =
            result.database && dbOk
                ? " Base de datos operativa."
                : result.database
                  ? " Estado de base de datos comprobado."
                  : "";
        return {
            ok: true,
            text: `Servicio de datos disponible.${suffix}`,
        };
    }
    if (result.status === 0) {
        return {
            ok: false,
            text: "No se pudo alcanzar el servidor de datos. Compruebe red y firewall.",
        };
    }
    return {
        ok: false,
        text: "El servidor de datos respondió con un error. Contacte con el administrador del sistema.",
    };
}

export function programStateSummary(params: {
    hasProgramId: boolean;
    actors: bigint | null;
    shipments: bigint | null;
    checkpoints: bigint | null;
    configReadable: boolean;
}): string {
    if (!params.hasProgramId) {
        return "Falta configurar el identificador del programa en el despliegue.";
    }
    if (!params.configReadable || params.actors === null) {
        return "Programa sin activar en esta red o lectura pendiente.";
    }
    return `Actores: ${params.actors} · Envíos: ${params.shipments ?? "—"} · Eventos: ${params.checkpoints ?? "—"}`;
}

export function catalogSourceLabel(params: {
    loading: boolean;
    fromApi: boolean;
}): string {
    if (params.loading) {
        return "Cargando listas de referencia…";
    }
    if (params.fromApi) {
        return "Listas de referencia del sistema central.";
    }
    return "Listas de referencia locales (sin conexión al sistema central).";
}
