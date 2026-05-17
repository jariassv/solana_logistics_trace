"use client";

import { sortCheckpointsByOccurredAt } from "@/lib/panel/timelineSort";
import type { CheckpointItem } from "@/lib/api/shipments";

export type CheckpointTableProps = {
    checkpoints: CheckpointItem[];
};

export function CheckpointTable({ checkpoints }: CheckpointTableProps) {
    const ordered = sortCheckpointsByOccurredAt(checkpoints);
    if (ordered.length === 0) {
        return <p className="text-muted text-sm mb-0">Sin registros en el historial.</p>;
    }

    return (
        <div className="table-wrap" data-testid="checkpoint-table">
            <table className="table table--compact">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Fecha</th>
                        <th scope="col">Ubicación</th>
                        <th scope="col">Actor</th>
                        <th scope="col">Coordenadas</th>
                    </tr>
                </thead>
                <tbody>
                    {ordered.map((c) => (
                        <tr key={c.checkpointId}>
                            <td className="mono text-xs">{c.onChainCheckpointId}</td>
                            <td>
                                <span className="badge badge--info">{c.type}</span>
                            </td>
                            <td className="text-sm">
                                <time dateTime={c.occurredAt}>{c.occurredAt}</time>
                            </td>
                            <td className="text-sm">{c.location ?? "—"}</td>
                            <td className="mono text-xs" title={c.actor}>
                                {c.actor.length > 12
                                    ? `${c.actor.slice(0, 6)}…${c.actor.slice(-4)}`
                                    : c.actor}
                            </td>
                            <td className="text-xs text-muted">
                                {c.latitude != null && c.longitude != null
                                    ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
                                    : "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
