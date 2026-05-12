"use client";

import type { CheckpointItem } from "@/lib/api/shipments";

export type CheckpointTimelineProps = {
    checkpoints: CheckpointItem[];
};

export function CheckpointTimeline({ checkpoints }: CheckpointTimelineProps) {
    if (checkpoints.length === 0) {
        return <p className="text-muted text-sm">Sin checkpoints registrados.</p>;
    }

    return (
        <ol className="panel-etapa2-timeline" data-testid="checkpoint-timeline">
            {checkpoints.map((c) => (
                <li key={c.checkpointId} className="panel-etapa2-timeline__item">
                    <div className="panel-etapa2-timeline__dot" aria-hidden />
                    <div className="panel-etapa2-timeline__body">
                        <div className="panel-etapa2-timeline__row">
                            <span className="badge badge--info">{c.type}</span>
                            <time className="text-sm text-muted" dateTime={c.occurredAt}>
                                {c.occurredAt}
                            </time>
                        </div>
                        {c.location && (
                            <p className="text-sm mt-1 mb-0">{c.location}</p>
                        )}
                        <p className="text-xs text-muted mono mt-1 mb-0">{c.actor}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
