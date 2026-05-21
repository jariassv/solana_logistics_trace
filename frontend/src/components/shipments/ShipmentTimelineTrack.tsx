"use client";

import { CheckpointTypeIcon } from "@/components/ui/TraceIcons";
import type { CheckpointItem } from "@/lib/api/shipments";
import {
    checkpointIconKind,
    checkpointTypeLabel,
    formatOccurredAt,
} from "@/lib/shipments/checkpointDisplay";
import { sortCheckpointsByOccurredAt } from "@/lib/panel/timelineSort";

export type ShipmentTimelineTrackProps = {
    checkpoints: CheckpointItem[];
};

export function ShipmentTimelineTrack({ checkpoints }: ShipmentTimelineTrackProps) {
    const ordered = sortCheckpointsByOccurredAt(checkpoints);
    if (ordered.length === 0) {
        return (
            <p className="text-sm text-muted mb-0" role="status">
                Sin eventos logísticos registrados.
            </p>
        );
    }

    return (
        <ol className="shipment-timeline" data-testid="checkpoint-timeline">
            {ordered.map((c) => {
                const kind = checkpointIconKind(c.type);
                const isSystem = c.actor.startsWith("system@");
                return (
                    <li key={c.checkpointId} className="shipment-timeline__item">
                        <span className={`shipment-timeline__icon shipment-timeline__icon--${kind}`}>
                            <CheckpointTypeIcon kind={kind} />
                        </span>
                        <div className="shipment-timeline__body">
                            <div className="shipment-timeline__row">
                                <span className={`shipment-timeline__type shipment-timeline__type--${kind}`}>
                                    {checkpointTypeLabel(c.type)}
                                </span>
                                <time className="shipment-timeline__time" dateTime={c.occurredAt}>
                                    {formatOccurredAt(c.occurredAt)}
                                </time>
                            </div>
                            {c.location ? (
                                <p className="shipment-timeline__location">{c.location}</p>
                            ) : null}
                            <p className="shipment-timeline__actor">
                                <span className="shipment-timeline__actor-name">
                                    {c.actorDisplayName}
                                </span>
                                {!isSystem ? (
                                    <span className="shipment-timeline__actor-wallet mono">
                                        {c.actorWalletMasked}
                                        {c.actorRole ? ` · ${c.actorRole}` : ""}
                                    </span>
                                ) : null}
                            </p>
                            {(c.temperatureCenti != null || c.humidity != null) && (
                                <p className="shipment-timeline__sensors text-xs text-muted mb-0">
                                    {c.temperatureCenti != null
                                        ? `Temp ${(c.temperatureCenti / 100).toFixed(1)} °C`
                                        : null}
                                    {c.temperatureCenti != null && c.humidity != null ? " · " : null}
                                    {c.humidity != null ? `HR ${c.humidity}%` : null}
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
