import type { IncidentItem } from "@/lib/api/incidents";
import type { CheckpointItem } from "@/lib/api/shipments";
import { canAnchorAutoIncident, mapAutoIncidentToOnChainType } from "@/lib/incidents/anchorOnChain";
import { CriticalIncidentTypeCode } from "@/lib/solana/ix";
import { resolveOperationalJourneyStepId } from "@/lib/shipments/journeyTimeline";

/** Solo incidencias con severidad Critical aparecen en trazabilidad. */
export function isCriticalIncident(incident: IncidentItem): boolean {
    return incident.severity === "Critical";
}

export function filterCriticalIncidents(incidents: readonly IncidentItem[]): IncidentItem[] {
    return incidents.filter(isCriticalIncident);
}

const LOSS_TYPE_CODES = new Set(["Lost", "SHIPMENT_LOST"]);

/** Incidencia automática del motor que debe abrir el modal de firma on-chain. */
export function pickIncidentForAutoAnchorModal(
    incidents: readonly IncidentItem[],
    alreadyPrompted: ReadonlySet<string>,
): IncidentItem | null {
    for (const inc of incidents) {
        if (alreadyPrompted.has(inc.id)) {
            continue;
        }
        if (canAnchorAutoIncident(inc)) {
            return inc;
        }
    }
    return null;
}

function evidenceIncidentType(incident: IncidentItem): string | null {
    const ev = incident.evidenceJson;
    if (!ev) {
        return null;
    }
    const t = ev.incidentType;
    return typeof t === "string" ? t : null;
}

/** Tipo de incidencia que representa pérdida (motor, on-chain o evidencia). */
export function isLossIncident(incident: IncidentItem): boolean {
    if (LOSS_TYPE_CODES.has(incident.incidentType)) {
        return true;
    }
    const fromEvidence = evidenceIncidentType(incident);
    if (fromEvidence && LOSS_TYPE_CODES.has(fromEvidence)) {
        return true;
    }
    return mapAutoIncidentToOnChainType(incident.incidentType) === CriticalIncidentTypeCode.Lost;
}

/** Etapa del rail a resaltar en rojo cuando hay pérdida abierta. */
export function resolveLossJourneyStepId(
    incidents: readonly IncidentItem[],
    status: string,
    checkpoints: readonly CheckpointItem[],
): string | null {
    const hasOpenLoss = incidents.some((i) => i.status === "Open" && isLossIncident(i));
    if (!hasOpenLoss) {
        return null;
    }
    return resolveOperationalJourneyStepId(status, checkpoints);
}
