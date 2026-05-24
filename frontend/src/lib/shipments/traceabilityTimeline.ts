import type { IncidentItem } from "@/lib/api/incidents";
import type { CheckpointItem } from "@/lib/api/shipments";
import {
    filterCriticalIncidents,
    isLossIncident,
} from "@/lib/incidents/criticalIncidentFlow";
import { sortCheckpointsByOccurredAt } from "@/lib/panel/timelineSort";

export type TraceabilityCheckpointEntry = {
    kind: "checkpoint";
    occurredAt: string;
    checkpoint: CheckpointItem;
};

export type TraceabilityIncidentEntry = {
    kind: "incident";
    occurredAt: string;
    incident: IncidentItem;
    isLoss: boolean;
};

export type TraceabilityEntry = TraceabilityCheckpointEntry | TraceabilityIncidentEntry;

/** Combina checkpoints e incidencias en orden cronológico para la pestaña Trazabilidad. */
export function buildTraceabilityTimeline(
    checkpoints: readonly CheckpointItem[],
    incidents: readonly IncidentItem[],
): TraceabilityEntry[] {
    const orderedCp = sortCheckpointsByOccurredAt([...checkpoints]);
    const criticalIncidents = filterCriticalIncidents(incidents);
    const entries: TraceabilityEntry[] = [
        ...orderedCp.map(
            (checkpoint): TraceabilityCheckpointEntry => ({
                kind: "checkpoint",
                occurredAt: checkpoint.occurredAt,
                checkpoint,
            }),
        ),
        ...criticalIncidents.map(
            (incident): TraceabilityIncidentEntry => ({
                kind: "incident",
                occurredAt: incident.detectedAt,
                incident,
                isLoss: isLossIncident(incident),
            }),
        ),
    ];
    entries.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    return entries;
}
