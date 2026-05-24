import { canReportCriticalIncident } from "@/lib/panel/capabilities";

export function canReportCriticalIncidentAction(params: {
    role: string | null;
    hasWallet: boolean;
    programConfigured: boolean;
    actorOnChain: boolean | null;
    actorLoading: boolean;
    hasRegisteredLoss?: boolean;
}): { enabled: boolean; reason?: string } {
    if (params.hasRegisteredLoss) {
        return {
            enabled: false,
            reason: "Este envío tiene pérdida registrada; no se admiten más incidencias.",
        };
    }
    if (params.actorLoading) {
        return { enabled: false, reason: "Comprobando actor en backend…" };
    }
    if (!params.hasWallet) {
        return { enabled: false, reason: "Conecte la wallet para firmar." };
    }
    if (!params.programConfigured) {
        return { enabled: false, reason: "Configure NEXT_PUBLIC_PROGRAM_ID." };
    }
    if (params.actorOnChain === false) {
        return { enabled: false, reason: "Registre su actor en esta red antes de reportar." };
    }
    if (!canReportCriticalIncident(params.role)) {
        return {
            enabled: false,
            reason: "Solo remitente, transportista o destinatario pueden reportar incidencias críticas.",
        };
    }
    return { enabled: true };
}
