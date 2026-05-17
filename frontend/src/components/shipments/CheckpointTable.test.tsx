import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CheckpointItem } from "@/lib/api/shipments";

import { CheckpointTable } from "./CheckpointTable";

function checkpoint(partial: Partial<CheckpointItem> = {}): CheckpointItem {
    return {
        checkpointId: "cp-1",
        onChainCheckpointId: "1",
        type: "Pickup",
        occurredAt: "2026-01-02T12:00:00Z",
        location: "Hub Central",
        actor: "ActorWallet11111111111111111111111111111111",
        temperatureCenti: null,
        humidity: null,
        latitude: 10.5,
        longitude: -66.9,
        metadata: {},
        txHash: "tx-hash",
        ...partial,
    };
}

describe("CheckpointTable", () => {
    it("shows empty message without checkpoints", () => {
        render(<CheckpointTable checkpoints={[]} />);
        expect(screen.getByText(/sin registros/i)).toBeInTheDocument();
    });

    it("renders rows sorted by occurredAt", () => {
        render(
            <CheckpointTable
                checkpoints={[
                    checkpoint({
                        checkpointId: "older",
                        occurredAt: "2026-01-01T00:00:00Z",
                        type: "Created",
                    }),
                    checkpoint({
                        checkpointId: "newer",
                        occurredAt: "2026-01-03T00:00:00Z",
                        type: "Delivered",
                    }),
                ]}
            />,
        );

        expect(screen.getByTestId("checkpoint-table")).toBeInTheDocument();
        expect(screen.getByText("Delivered")).toBeInTheDocument();
        expect(screen.getAllByText("Hub Central")).toHaveLength(2);
    });
});
